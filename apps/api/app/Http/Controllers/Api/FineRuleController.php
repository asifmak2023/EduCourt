<?php

namespace App\Http\Controllers\Api;

use App\Enums\FineCategory;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\FineRuleResource;
use App\Models\FineRule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class FineRuleController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $rules = FineRule::query()
            ->with('feeHead')
            ->withCount('fines')
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            }))
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->string('category')->toString()))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 25));

        return FineRuleResource::collection($rules);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $rule = FineRule::create($data + $tenant);

        return (new FineRuleResource($rule->load('feeHead')))
            ->response()->setStatusCode(201);
    }

    public function show(FineRule $fineRule): FineRuleResource
    {
        return new FineRuleResource($fineRule->load(['feeHead', 'fines.student']));
    }

    public function update(Request $request, FineRule $fineRule): FineRuleResource
    {
        $data = $request->validate($this->rules($fineRule->campus_id, $fineRule->id, false));

        $fineRule->update($data);

        return new FineRuleResource($fineRule->refresh()->load('feeHead'));
    }

    public function destroy(FineRule $fineRule): JsonResponse
    {
        $fineRule->delete();

        return response()->json(['message' => 'Fine rule archived.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, ?int $ignoreId = null, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'name' => [$presence, 'string', 'max:191'],
            'code' => [
                $presence, 'string', 'max:50',
                Rule::unique('fine_rules', 'code')
                    ->where('campus_id', $campusId)
                    ->whereNull('deleted_at')
                    ->ignore($ignoreId),
            ],
            'category' => ['sometimes', Rule::enum(FineCategory::class)],
            'amount' => [$presence, 'numeric', 'min:0'],
            'fee_head_id' => [
                $presence, 'integer',
                Rule::exists('fee_heads', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'is_active' => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
