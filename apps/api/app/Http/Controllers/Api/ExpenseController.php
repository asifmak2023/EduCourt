<?php

namespace App\Http\Controllers\Api;

use App\Enums\ExpenseStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ExpenseResource;
use App\Models\Expense;
use App\Services\Accounting\ExpenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ExpenseController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly ExpenseService $expenses) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $expenses = Expense::query()
            ->with(['vendor', 'fiscalYear'])
            ->when($request->filled('vendor_id'), fn ($q) => $q->where('vendor_id', $request->integer('vendor_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('expense_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('expense_date', '<=', $request->date('to')))
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('reference', 'like', "%{$search}%")
                    ->orWhere('bill_no', 'like', "%{$search}%")
                    ->orWhere('payee_name', 'like', "%{$search}%");
            }))
            ->orderByDesc('expense_date')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return ExpenseResource::collection($expenses);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));

        $expense = DB::transaction(function () use ($data, $tenant, $request) {
            $fiscalYear = $this->expenses->fiscalYearFor($data['expense_date']);

            $expense = Expense::create([
                'institution_id' => $tenant['institution_id'],
                'campus_id' => $tenant['campus_id'],
                'fiscal_year_id' => $fiscalYear->id,
                'vendor_id' => $data['vendor_id'] ?? null,
                'reference' => $this->expenses->nextReference($tenant['campus_id']),
                'expense_date' => $data['expense_date'],
                'status' => ExpenseStatus::Draft,
                'payee_name' => $data['payee_name'] ?? null,
                'bill_no' => $data['bill_no'] ?? null,
                'memo' => $data['memo'] ?? null,
                'total' => 0,
                'paid_amount' => 0,
                'created_by' => $request->user()->id,
            ]);

            $this->syncLines($expense, $data['lines']);

            return $expense;
        });

        return (new ExpenseResource($expense->load($this->relations())))
            ->response()->setStatusCode(201);
    }

    public function show(Expense $expense): ExpenseResource
    {
        return new ExpenseResource($expense->load($this->relations(['payments'])));
    }

    public function update(Request $request, Expense $expense): ExpenseResource
    {
        $this->assertDraft($expense);

        $data = $request->validate($this->rules($expense->campus_id, false));

        DB::transaction(function () use ($expense, $data) {
            $attributes = [];

            foreach (['vendor_id', 'payee_name', 'bill_no', 'memo'] as $key) {
                if (array_key_exists($key, $data)) {
                    $attributes[$key] = $data[$key];
                }
            }

            if (array_key_exists('expense_date', $data)) {
                $attributes['expense_date'] = $data['expense_date'];
                $attributes['fiscal_year_id'] = $this->expenses->fiscalYearFor($data['expense_date'])->id;
            }

            $expense->update($attributes);

            if (array_key_exists('lines', $data)) {
                $this->syncLines($expense, $data['lines']);
            }
        });

        return new ExpenseResource($expense->refresh()->load($this->relations()));
    }

    public function destroy(Expense $expense): JsonResponse
    {
        $this->assertDraft($expense);

        $expense->delete();

        return response()->json(['message' => 'Expense archived.']);
    }

    public function approve(Request $request, Expense $expense): ExpenseResource
    {
        $expense = $this->expenses->approve($expense, $request->user()->id);

        return new ExpenseResource($expense->load($this->relations(['payments'])));
    }

    public function void(Request $request, Expense $expense): ExpenseResource
    {
        $data = $request->validate([
            'memo' => ['nullable', 'string', 'max:2000'],
        ]);

        $expense = $this->expenses->voidExpense($expense, $request->user()->id, $data['memo'] ?? null);

        return new ExpenseResource($expense->load($this->relations(['payments'])));
    }

    private function assertDraft(Expense $expense): void
    {
        if ($expense->status !== ExpenseStatus::Draft) {
            throw ValidationException::withMessages([
                'status' => ['Only draft expenses can be changed.'],
            ]);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $lines
     */
    private function syncLines(Expense $expense, array $lines): void
    {
        $expense->lines()->delete();

        $total = 0.0;

        foreach (array_values($lines) as $line) {
            $amount = round((float) $line['amount'], 2);
            $total += $amount;

            $expense->lines()->create([
                'expense_category_id' => $line['expense_category_id'],
                'amount' => $amount,
                'description' => $line['description'] ?? null,
            ]);
        }

        $expense->forceFill(['total' => round($total, 2)])->save();
    }

    /**
     * @param  array<int, string>  $extra
     * @return array<int, string>
     */
    private function relations(array $extra = []): array
    {
        return array_merge(['vendor', 'fiscalYear', 'lines.category'], $extra);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'vendor_id' => [
                'nullable', 'integer',
                Rule::exists('vendors', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'expense_date' => [$presence, 'date'],
            'payee_name' => ['nullable', 'string', 'max:191'],
            'bill_no' => ['nullable', 'string', 'max:64'],
            'memo' => ['nullable', 'string', 'max:2000'],
            'lines' => [$presence, 'array', 'min:1'],
            'lines.*.expense_category_id' => [
                'required', 'integer',
                Rule::exists('expense_categories', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'lines.*.amount' => ['required', 'numeric', 'gt:0'],
            'lines.*.description' => ['nullable', 'string', 'max:255'],
        ];
    }
}
