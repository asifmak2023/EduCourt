<?php

namespace App\Http\Controllers\Api;

use App\Enums\BudgetPeriodType;
use App\Enums\BudgetStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\BudgetResource;
use App\Models\Budget;
use App\Models\ChartOfAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BudgetController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $budgets = Budget::query()
            ->with(['fiscalYear', 'lines.chartOfAccount'])
            ->when($request->filled('fiscal_year_id'), fn ($q) => $q->where('fiscal_year_id', $request->integer('fiscal_year_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->orderByDesc('starts_on')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return BudgetResource::collection($budgets);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));
        $this->assertUniqueName($tenant['campus_id'], $data['fiscal_year_id'], $data['name']);

        $budget = DB::transaction(function () use ($data, $tenant, $request) {
            $budget = Budget::create([
                'institution_id' => $tenant['institution_id'],
                'campus_id' => $tenant['campus_id'],
                'fiscal_year_id' => $data['fiscal_year_id'],
                'name' => $data['name'],
                'period_type' => $data['period_type'],
                'starts_on' => $data['starts_on'],
                'ends_on' => $data['ends_on'],
                'status' => BudgetStatus::Draft,
                'notes' => $data['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            $this->syncLines($budget, $data['lines'], $tenant);

            return $budget;
        });

        return (new BudgetResource($budget->load($this->relations())))
            ->response()->setStatusCode(201);
    }

    public function show(Budget $budget): BudgetResource
    {
        return new BudgetResource($budget->load($this->relations()));
    }

    public function update(Request $request, Budget $budget): BudgetResource
    {
        $this->assertEditable($budget);

        $data = $request->validate($this->rules($budget->campus_id, false));
        $this->assertUniqueName(
            $budget->campus_id,
            $data['fiscal_year_id'] ?? $budget->fiscal_year_id,
            $data['name'] ?? $budget->name,
            $budget->id,
        );

        $tenant = [
            'institution_id' => $budget->institution_id,
            'campus_id' => $budget->campus_id,
        ];

        DB::transaction(function () use ($budget, $data, $tenant) {
            $budget->update(array_filter([
                'fiscal_year_id' => $data['fiscal_year_id'] ?? null,
                'name' => $data['name'] ?? null,
                'period_type' => $data['period_type'] ?? null,
                'starts_on' => $data['starts_on'] ?? null,
                'ends_on' => $data['ends_on'] ?? null,
                'notes' => $data['notes'] ?? null,
            ], fn ($value) => $value !== null));

            if (array_key_exists('lines', $data)) {
                $this->syncLines($budget, $data['lines'], $tenant);
            }
        });

        return new BudgetResource($budget->refresh()->load($this->relations()));
    }

    public function destroy(Budget $budget): JsonResponse
    {
        $this->assertEditable($budget);

        $budget->delete();

        return response()->json(['message' => 'Budget archived.']);
    }

    public function approve(Request $request, Budget $budget): BudgetResource
    {
        if ($budget->status !== BudgetStatus::Draft) {
            throw ValidationException::withMessages([
                'status' => ['Only draft budgets can be approved.'],
            ]);
        }

        $budget->forceFill([
            'status' => BudgetStatus::Approved,
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ])->save();

        return new BudgetResource($budget->refresh()->load($this->relations()));
    }

    private function assertEditable(Budget $budget): void
    {
        if ($budget->status !== BudgetStatus::Draft) {
            throw ValidationException::withMessages([
                'status' => ['Only draft budgets can be changed.'],
            ]);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $lines
     * @param  array{institution_id: int, campus_id: int}  $tenant
     */
    private function syncLines(Budget $budget, array $lines, array $tenant): void
    {
        $accounts = ChartOfAccount::query()
            ->whereIn('id', collect($lines)->pluck('chart_of_account_id'))
            ->get()
            ->keyBy('id');

        $budget->lines()->delete();

        foreach (array_values($lines) as $index => $line) {
            $account = $accounts->get($line['chart_of_account_id']);

            if ($account === null || $account->is_group) {
                throw ValidationException::withMessages([
                    "lines.{$index}.chart_of_account_id" => ['The selected account must be a postable (non-group) account.'],
                ]);
            }

            $budget->lines()->create([
                'institution_id' => $tenant['institution_id'],
                'campus_id' => $tenant['campus_id'],
                'chart_of_account_id' => $account->id,
                'amount' => $line['amount'],
                'notes' => $line['notes'] ?? null,
            ]);
        }
    }

    /**
     * @return array<int, string>
     */
    private function relations(): array
    {
        return ['fiscalYear', 'lines.chartOfAccount'];
    }

    private function assertUniqueName(int $campusId, int $fiscalYearId, string $name, ?int $ignoreId = null): void
    {
        $exists = Budget::query()
            ->where('campus_id', $campusId)
            ->where('fiscal_year_id', $fiscalYearId)
            ->where('name', $name)
            ->when($ignoreId !== null, fn ($q) => $q->whereKeyNot($ignoreId))
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'name' => ['A budget with this name already exists for the fiscal year.'],
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'fiscal_year_id' => [
                $presence, 'integer',
                Rule::exists('fiscal_years', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'name' => [$presence, 'string', 'max:191'],
            'period_type' => [$presence, Rule::enum(BudgetPeriodType::class)],
            'starts_on' => [$presence, 'date'],
            'ends_on' => [$presence, 'date', 'after_or_equal:starts_on'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'lines' => [$presence, 'array', 'min:1'],
            'lines.*.chart_of_account_id' => [
                'required', 'integer', 'distinct',
                Rule::exists('chart_of_accounts', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'lines.*.amount' => ['required', 'numeric', 'min:0'],
            'lines.*.notes' => ['nullable', 'string', 'max:255'],
        ];
    }
}
