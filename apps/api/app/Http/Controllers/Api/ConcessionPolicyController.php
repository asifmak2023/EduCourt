<?php

namespace App\Http\Controllers\Api;

use App\Enums\ConcessionType;
use App\Enums\DiscountType;
use App\Enums\Gender;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ConcessionPolicyResource;
use App\Models\ConcessionPolicy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ConcessionPolicyController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $policies = ConcessionPolicy::query()
            ->with(['academicYear', 'classRoom'])
            ->withCount('concessions')
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            }))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')->toString()))
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('priority')
            ->orderBy('name')
            ->paginate($request->integer('per_page', 25));

        return ConcessionPolicyResource::collection($policies);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $policy = ConcessionPolicy::create($data + $tenant);

        return (new ConcessionPolicyResource($policy->load(['academicYear', 'classRoom'])))
            ->response()->setStatusCode(201);
    }

    public function show(ConcessionPolicy $concessionPolicy): ConcessionPolicyResource
    {
        return new ConcessionPolicyResource($concessionPolicy->load([
            'academicYear',
            'classRoom',
            'concessions.student',
        ]));
    }

    public function update(Request $request, ConcessionPolicy $concessionPolicy): ConcessionPolicyResource
    {
        $data = $request->validate($this->rules($concessionPolicy->campus_id, $concessionPolicy->id, false));

        $concessionPolicy->update($data);

        return new ConcessionPolicyResource($concessionPolicy->refresh()->load(['academicYear', 'classRoom']));
    }

    public function destroy(ConcessionPolicy $concessionPolicy): JsonResponse
    {
        $concessionPolicy->delete();

        return response()->json(['message' => 'Concession policy archived.']);
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
                Rule::unique('concession_policies', 'code')
                    ->where('campus_id', $campusId)
                    ->whereNull('deleted_at')
                    ->ignore($ignoreId),
            ],
            'type' => ['sometimes', Rule::enum(ConcessionType::class)],
            'discount_type' => [$presence, Rule::enum(DiscountType::class)],
            'value' => [$presence, 'numeric', 'min:0'],
            'max_amount' => ['nullable', 'numeric', 'min:0'],
            'criteria' => ['nullable', 'array:gender,categories,min_siblings'],
            'criteria.gender' => ['nullable', 'array'],
            'criteria.gender.*' => [Rule::enum(Gender::class)],
            'criteria.categories' => ['nullable', 'array'],
            'criteria.categories.*' => ['string', 'max:50'],
            'criteria.min_siblings' => ['nullable', 'integer', 'min:1'],
            'priority' => ['sometimes', 'integer', 'min:0'],
            'is_stackable' => ['sometimes', 'boolean'],
            'requires_approval' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'academic_year_id' => [
                'nullable', 'integer',
                Rule::exists('academic_years', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'class_room_id' => [
                'nullable', 'integer',
                Rule::exists('class_rooms', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'description' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
