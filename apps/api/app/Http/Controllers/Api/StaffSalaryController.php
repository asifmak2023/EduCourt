<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\StaffSalaryResource;
use App\Models\StaffSalary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StaffSalaryController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $salaries = StaffSalary::query()
            ->with(['items.component', 'staffMember'])
            ->when($request->filled('staff_member_id'), fn ($q) => $q->where('staff_member_id', $request->integer('staff_member_id')))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderByDesc('effective_from')
            ->paginate($request->integer('per_page', 50));

        return StaffSalaryResource::collection($salaries);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $salary = DB::transaction(function () use ($data, $tenant) {
            $salary = StaffSalary::create(collect($data)->except('items')->all() + $tenant);
            $this->syncItems($salary, $data['items'] ?? []);

            return $salary;
        });

        return (new StaffSalaryResource($salary->load(['items.component', 'staffMember'])))
            ->response()->setStatusCode(201);
    }

    public function show(StaffSalary $staffSalary): StaffSalaryResource
    {
        return new StaffSalaryResource($staffSalary->load(['items.component', 'staffMember']));
    }

    public function update(Request $request, StaffSalary $staffSalary): StaffSalaryResource
    {
        $data = $request->validate($this->rules($staffSalary->campus_id, false));

        DB::transaction(function () use ($staffSalary, $data) {
            $staffSalary->update(collect($data)->except('items')->all());

            if (array_key_exists('items', $data)) {
                $this->syncItems($staffSalary, $data['items']);
            }
        });

        return new StaffSalaryResource($staffSalary->load(['items.component', 'staffMember']));
    }

    public function destroy(StaffSalary $staffSalary): JsonResponse
    {
        $staffSalary->delete();

        return response()->json(['message' => 'Salary structure removed.']);
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    private function syncItems(StaffSalary $salary, array $items): void
    {
        $salary->items()->delete();

        foreach ($items as $item) {
            $salary->items()->create([
                'salary_component_id' => $item['salary_component_id'],
                'amount' => $item['amount'] ?? null,
                'percentage' => $item['percentage'] ?? null,
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
            'staff_member_id' => [
                $presence, 'integer',
                Rule::exists('staff_members', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'basic_salary' => [$presence, 'numeric', 'min:0'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'effective_from' => [$presence, 'date'],
            'effective_to' => ['nullable', 'date', 'after_or_equal:effective_from'],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string'],
            'items' => ['sometimes', 'array'],
            'items.*.salary_component_id' => [
                'required', 'integer',
                Rule::exists('salary_components', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'items.*.amount' => ['nullable', 'numeric', 'min:0'],
            'items.*.percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ];
    }
}
