<?php

namespace App\Http\Controllers\Api;

use App\Enums\BankAccountType;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\BankAccountResource;
use App\Models\BankAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class BankAccountController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $accounts = BankAccount::query()
            ->with('chartOfAccount')
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('account_no', 'like', "%{$search}%");
            }))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')->toString()))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return BankAccountResource::collection($accounts);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));

        $account = BankAccount::create($data + $tenant);

        return (new BankAccountResource($account->load('chartOfAccount')))->response()->setStatusCode(201);
    }

    public function show(BankAccount $bankAccount): BankAccountResource
    {
        return new BankAccountResource($bankAccount->load('chartOfAccount'));
    }

    public function update(Request $request, BankAccount $bankAccount): BankAccountResource
    {
        $data = $request->validate($this->rules($bankAccount->campus_id, $bankAccount->id, false));

        $bankAccount->update($data);

        return new BankAccountResource($bankAccount->load('chartOfAccount'));
    }

    public function destroy(BankAccount $bankAccount): JsonResponse
    {
        if ($bankAccount->reconciliations()->exists()) {
            return response()->json([
                'message' => 'Bank account has reconciliations and cannot be archived.',
            ], 409);
        }

        $bankAccount->delete();

        return response()->json(['message' => 'Bank account archived.']);
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
                Rule::unique('bank_accounts', 'code')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'name' => [$presence, 'string', 'max:191'],
            'type' => [$presence, Rule::enum(BankAccountType::class)],
            'chart_of_account_id' => [
                $presence, 'integer',
                Rule::exists('chart_of_accounts', 'id')
                    ->where('campus_id', $campusId)
                    ->where('account_type', 'asset')
                    ->where('is_group', false)
                    ->whereNull('deleted_at'),
            ],
            'account_no' => ['nullable', 'string', 'max:64'],
            'bank_name' => ['nullable', 'string', 'max:191'],
            'branch' => ['nullable', 'string', 'max:191'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'opening_balance' => ['sometimes', 'numeric'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
