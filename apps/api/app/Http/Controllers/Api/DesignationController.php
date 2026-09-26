<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\DesignationResource;
use App\Models\Designation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class DesignationController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $designations = Designation::query()
            ->with('department')
            ->when($request->filled('department_id'), fn ($q) => $q->where('department_id', $request->integer('department_id')))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return DesignationResource::collection($designations);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $designation = Designation::create($data + $tenant);

        return (new DesignationResource($designation->load('department')))->response()->setStatusCode(201);
    }

    public function show(Designation $designation): DesignationResource
    {
        return new DesignationResource($designation->load('department'));
    }

    public function update(Request $request, Designation $designation): DesignationResource
    {
        $data = $request->validate($this->rules($designation->campus_id, $designation->id, false));

        $designation->update($data);

        return new DesignationResource($designation->load('department'));
    }

    public function destroy(Designation $designation): JsonResponse
    {
        $designation->delete();

        return response()->json(['message' => 'Designation removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, ?int $ignoreId = null, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'name' => [$presence, 'string', 'max:255'],
            'code' => [
                $presence, 'string', 'max:32',
                Rule::unique('designations', 'code')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'department_id' => [
                'nullable', 'integer',
                Rule::exists('departments', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'grade' => ['nullable', 'string', 'max:32'],
            'job_description' => ['nullable', 'string'],
            'responsibilities' => ['nullable', 'array'],
            'responsibilities.*' => ['string', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
