<?php

namespace App\Http\Controllers\Api;

use App\Enums\LiabilityStatus;
use App\Enums\LiabilityType;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\LiabilityResource;
use App\Models\Liability;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class LiabilityController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $liabilities = Liability::query()
            ->with('chartOfAccount')
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('lender', 'like', "%{$search}%");
            }))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')->toString()))
            ->orderBy('code')
            ->paginate($request->integer('per_page', 50));

        return LiabilityResource::collection($liabilities);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));

        if (! array_key_exists('outstanding_amount', $data) || $data['outstanding_amount'] === null) {
            $data['outstanding_amount'] = $data['principal_amount'];
        }

        $liability = Liability::create($data + $tenant);

        return (new LiabilityResource($liability->load('chartOfAccount')))->response()->setStatusCode(201);
    }

    public function show(Liability $liability): LiabilityResource
    {
        return new LiabilityResource($liability->load('chartOfAccount'));
    }

    public function update(Request $request, Liability $liability): LiabilityResource
    {
        $data = $request->validate($this->rules($liability->campus_id, $liability->id, false));

        $liability->update($data);

        return new LiabilityResource($liability->load('chartOfAccount'));
    }

    public function destroy(Liability $liability): JsonResponse
    {
        $liability->delete();

        return response()->json(['message' => 'Liability archived.']);
    }

    public function settle(Request $request, Liability $liability): LiabilityResource
    {
        if (! $liability->isActive()) {
            throw ValidationException::withMessages([
                'status' => ['Only active liabilities can be settled.'],
            ]);
        }

        $data = $request->validate([
            'settled_on' => ['required', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $liability->update([
            'status' => LiabilityStatus::Settled,
            'settled_on' => $data['settled_on'],
            'outstanding_amount' => 0,
            'notes' => $data['notes'] ?? $liability->notes,
        ]);

        return new LiabilityResource($liability->refresh()->load('chartOfAccount'));
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
                Rule::unique('liabilities', 'code')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'name' => [$presence, 'string', 'max:191'],
            'type' => [$presence, Rule::enum(LiabilityType::class)],
            'lender' => ['nullable', 'string', 'max:191'],
            'principal_amount' => [$presence, 'numeric', 'min:0'],
            'interest_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'starts_on' => ['nullable', 'date'],
            'matures_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
            'installment_amount' => ['nullable', 'numeric', 'min:0'],
            'outstanding_amount' => ['nullable', 'numeric', 'min:0'],
            'status' => ['sometimes', Rule::enum(LiabilityStatus::class)],
            'settled_on' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'chart_of_account_id' => [
                'nullable', 'integer',
                Rule::exists('chart_of_accounts', 'id')
                    ->where('campus_id', $campusId)
                    ->where('account_type', 'liability')
                    ->where('is_group', false)
                    ->whereNull('deleted_at'),
            ],
        ];
    }
}
