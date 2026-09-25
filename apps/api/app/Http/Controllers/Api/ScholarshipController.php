<?php

namespace App\Http\Controllers\Api;

use App\Enums\ScholarshipDiscountType;
use App\Enums\ScholarshipType;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ScholarshipResource;
use App\Models\Scholarship;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ScholarshipController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $scholarships = Scholarship::query()
            ->with('academicYear')
            ->withCount('awards')
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('sponsor', 'like', "%{$search}%");
            }))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')->toString()))
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 25));

        return ScholarshipResource::collection($scholarships);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $scholarship = Scholarship::create($data + $tenant);

        return (new ScholarshipResource($scholarship->load('academicYear')))
            ->response()->setStatusCode(201);
    }

    public function show(Scholarship $scholarship): ScholarshipResource
    {
        return new ScholarshipResource($scholarship->load([
            'academicYear',
            'awards.student',
        ]));
    }

    public function update(Request $request, Scholarship $scholarship): ScholarshipResource
    {
        $data = $request->validate($this->rules($scholarship->campus_id, $scholarship->id, false));

        $scholarship->update($data);

        return new ScholarshipResource($scholarship->refresh()->load('academicYear'));
    }

    public function destroy(Scholarship $scholarship): JsonResponse
    {
        $scholarship->delete();

        return response()->json(['message' => 'Scholarship archived.']);
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
                Rule::unique('scholarships', 'code')
                    ->where('campus_id', $campusId)
                    ->whereNull('deleted_at')
                    ->ignore($ignoreId),
            ],
            'type' => ['sometimes', Rule::enum(ScholarshipType::class)],
            'discount_type' => [$presence, Rule::enum(ScholarshipDiscountType::class)],
            'value' => [$presence, 'numeric', 'min:0'],
            'academic_year_id' => [
                'nullable', 'integer',
                Rule::exists('academic_years', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'sponsor' => ['nullable', 'string', 'max:191'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
