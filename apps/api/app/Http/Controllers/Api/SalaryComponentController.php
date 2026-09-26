<?php

namespace App\Http\Controllers\Api;

use App\Enums\SalaryCalculation;
use App\Enums\SalaryComponentType;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\SalaryComponentResource;
use App\Models\SalaryComponent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class SalaryComponentController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $components = SalaryComponent::query()
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate($request->integer('per_page', 100));

        return SalaryComponentResource::collection($components);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $component = SalaryComponent::create($data + $tenant);

        return (new SalaryComponentResource($component))->response()->setStatusCode(201);
    }

    public function show(SalaryComponent $salaryComponent): SalaryComponentResource
    {
        return new SalaryComponentResource($salaryComponent);
    }

    public function update(Request $request, SalaryComponent $salaryComponent): SalaryComponentResource
    {
        $data = $request->validate($this->rules($salaryComponent->campus_id, $salaryComponent->id, false));

        $salaryComponent->update($data);

        return new SalaryComponentResource($salaryComponent);
    }

    public function destroy(SalaryComponent $salaryComponent): JsonResponse
    {
        $salaryComponent->delete();

        return response()->json(['message' => 'Salary component removed.']);
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
                Rule::unique('salary_components', 'code')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'type' => [$presence, Rule::enum(SalaryComponentType::class)],
            'calculation' => ['sometimes', Rule::enum(SalaryCalculation::class)],
            'default_amount' => ['nullable', 'numeric', 'min:0'],
            'default_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'is_taxable' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
