<?php

namespace App\Http\Controllers\Api;

use App\Enums\AccountType;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ChartOfAccountResource;
use App\Models\ChartOfAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ChartOfAccountController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $accounts = ChartOfAccount::query()
            ->with('children')
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            }))
            ->when($request->filled('account_type'), fn ($q) => $q->where('account_type', $request->string('account_type')->toString()))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->when($request->boolean('roots_only'), fn ($q) => $q->whereNull('parent_id'))
            ->orderBy('code')
            ->paginate($request->integer('per_page', 100));

        return ChartOfAccountResource::collection($accounts);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));
        $data += $tenant;
        $data['normal_balance'] = $this->resolveNormalBalance($data);

        $account = ChartOfAccount::create($data);

        return (new ChartOfAccountResource($account))->response()->setStatusCode(201);
    }

    public function show(ChartOfAccount $chartOfAccount): ChartOfAccountResource
    {
        return new ChartOfAccountResource($chartOfAccount->load(['children', 'parent']));
    }

    public function update(Request $request, ChartOfAccount $chartOfAccount): ChartOfAccountResource
    {
        $data = $request->validate($this->rules($chartOfAccount->campus_id, $chartOfAccount->id, false));

        if (isset($data['account_type'])) {
            $data['normal_balance'] = $this->resolveNormalBalance($data);
        }

        $chartOfAccount->update($data);

        return new ChartOfAccountResource($chartOfAccount);
    }

    public function destroy(ChartOfAccount $chartOfAccount): JsonResponse
    {
        if ($chartOfAccount->children()->exists() || $chartOfAccount->journalLines()->exists()) {
            return response()->json([
                'message' => 'Account has children or postings and cannot be archived.',
            ], 409);
        }

        $chartOfAccount->delete();

        return response()->json(['message' => 'Account archived.']);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function resolveNormalBalance(array $data): string
    {
        if (! empty($data['normal_balance'])) {
            return $data['normal_balance'];
        }

        return AccountType::from($data['account_type'])->normalBalance()->value;
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, ?int $ignoreId = null, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'code' => [
                $presence, 'string', 'max:32',
                Rule::unique('chart_of_accounts', 'code')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'name' => [$presence, 'string', 'max:191'],
            'account_type' => [$presence, Rule::enum(AccountType::class)],
            'normal_balance' => ['sometimes', Rule::in(['debit', 'credit'])],
            'parent_id' => [
                'nullable', 'integer',
                Rule::exists('chart_of_accounts', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'is_group' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
