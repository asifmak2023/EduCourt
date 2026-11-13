<?php

namespace App\Http\Controllers\Api;

use App\Enums\SalaryIncrementType;
use App\Enums\StaffStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\SalaryStructureResource;
use App\Models\SalaryStructure;
use App\Models\StaffMember;
use App\Models\StaffSalary;
use App\Services\SalaryAssignmentService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Reusable salary templates keyed by designation, mirroring fee structures.
 *
 * Templates are versioned: revising creates a new version and supersedes the
 * previous one, so history is preserved. Authoring a template never touches
 * payroll; applying it copies the basic salary and component lines into each
 * staff member's StaffSalary so the payroll engine keeps working unchanged.
 */
class SalaryStructureController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $search = $request->string('search')->toString();

        $structures = SalaryStructure::query()
            ->with(['items.component', 'designation'])
            ->when($request->filled('designation_id'), fn ($q) => $q->where('designation_id', $request->integer('designation_id')))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->when(! $request->boolean('include_history'), fn ($q) => $q->current())
            ->when($search !== '', fn ($q) => $q->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhereHas('designation', fn ($d) => $d->where('name', 'like', "%{$search}%"));
            }))
            ->orderBy('name')
            ->orderByDesc('version')
            ->paginate($request->integer('per_page', 50));

        return SalaryStructureResource::collection($structures);
    }

    public function resolve(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'designation_id' => ['required', 'integer'],
        ]);

        $structure = SalaryStructure::query()
            ->with(['items.component', 'designation'])
            ->where('designation_id', $data['designation_id'])
            ->where('is_active', true)
            ->current()
            ->first();

        return response()->json([
            'data' => $structure ? (new SalaryStructureResource($structure))->resolve() : null,
            'campus_id' => $tenant['campus_id'],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $structure = DB::transaction(function () use ($data, $tenant) {
            $structure = SalaryStructure::create([
                'institution_id' => $tenant['institution_id'],
                'campus_id' => $tenant['campus_id'],
                'designation_id' => $data['designation_id'],
                'name' => $data['name'],
                'version' => 1,
                'basic_salary' => $data['basic_salary'],
                'currency' => $data['currency'] ?? 'PKR',
                'effective_from' => $data['effective_from'] ?? null,
                'effective_to' => $data['effective_to'] ?? null,
                'is_active' => $data['is_active'] ?? true,
                'increment_type' => $data['increment_type'] ?? null,
                'increment_value' => $data['increment_value'] ?? null,
                'increment_every_months' => $data['increment_every_months'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            $this->syncItems($structure, $data['items'] ?? []);

            return $structure;
        });

        return (new SalaryStructureResource($structure->load(['items.component', 'designation'])))
            ->response()->setStatusCode(201);
    }

    public function show(SalaryStructure $salaryStructure): SalaryStructureResource
    {
        return new SalaryStructureResource($salaryStructure->load(['items.component', 'designation']));
    }

    public function update(Request $request, SalaryStructure $salaryStructure): SalaryStructureResource
    {
        $this->assertCurrent($salaryStructure);

        $data = $request->validate($this->rules($salaryStructure->campus_id, $salaryStructure->id, false));

        DB::transaction(function () use ($salaryStructure, $data) {
            $salaryStructure->update(collect($data)->except('items')->all());

            if (array_key_exists('items', $data)) {
                $salaryStructure->items()->delete();
                $this->syncItems($salaryStructure, $data['items']);
            }
        });

        return new SalaryStructureResource($salaryStructure->load(['items.component', 'designation']));
    }

    public function destroy(SalaryStructure $salaryStructure): JsonResponse
    {
        $salaryStructure->delete();

        return response()->json(['message' => 'Salary structure removed.']);
    }

    /**
     * Creates a new version of the structure, superseding the current one.
     *
     * Basic salary can be raised via an increment (`increment_type` +
     * `increment_value`) or given explicitly; component lines default to the
     * previous version when not supplied.
     */
    public function revise(Request $request, SalaryStructure $salaryStructure): JsonResponse
    {
        $this->assertCurrent($salaryStructure);

        $data = $request->validate([
            'increment_type' => ['nullable', Rule::enum(SalaryIncrementType::class)],
            'increment_value' => ['nullable', 'numeric', 'min:0'],
            'basic_salary' => ['nullable', 'numeric', 'min:0'],
            'name' => ['sometimes', 'string', 'max:255'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'effective_from' => ['nullable', 'date'],
            'effective_to' => ['nullable', 'date'],
            'increment_every_months' => ['nullable', 'integer', 'min:1', 'max:60'],
            'notes' => ['nullable', 'string'],
            'items' => ['sometimes', 'array'],
            'items.*.salary_component_id' => [
                'required', 'integer',
                Rule::exists('salary_components', 'id')->where('campus_id', $salaryStructure->campus_id)->whereNull('deleted_at'),
            ],
            'items.*.amount' => ['nullable', 'numeric', 'min:0'],
            'items.*.percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'items.*.sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $currentBasic = (float) $salaryStructure->basic_salary;
        $incrementType = $data['increment_type'] ?? null;
        $incrementValue = isset($data['increment_value']) ? (float) $data['increment_value'] : null;

        $nextBasic = match (true) {
            isset($data['basic_salary']) => round((float) $data['basic_salary'], 2),
            $incrementType !== null && $incrementValue !== null => SalaryIncrementType::from($incrementType)
                ->applyTo($currentBasic, $incrementValue),
            default => $currentBasic,
        };

        $next = DB::transaction(function () use ($salaryStructure, $data, $nextBasic) {
            $salaryStructure->load('items');

            $next = SalaryStructure::create([
                'institution_id' => $salaryStructure->institution_id,
                'campus_id' => $salaryStructure->campus_id,
                'designation_id' => $salaryStructure->designation_id,
                'name' => $data['name'] ?? $salaryStructure->name,
                'version' => $salaryStructure->version + 1,
                'basic_salary' => $nextBasic,
                'currency' => $data['currency'] ?? $salaryStructure->currency,
                'effective_from' => $data['effective_from'] ?? now()->toDateString(),
                'effective_to' => $data['effective_to'] ?? null,
                'is_active' => true,
                'increment_type' => array_key_exists('increment_type', $data)
                    ? $data['increment_type']
                    : $salaryStructure->increment_type?->value,
                'increment_value' => array_key_exists('increment_value', $data)
                    ? $data['increment_value']
                    : $salaryStructure->increment_value,
                'increment_every_months' => array_key_exists('increment_every_months', $data)
                    ? $data['increment_every_months']
                    : $salaryStructure->increment_every_months,
                'notes' => $data['notes'] ?? $salaryStructure->notes,
            ]);

            if (array_key_exists('items', $data)) {
                $this->syncItems($next, $data['items']);
            } else {
                foreach ($salaryStructure->items as $item) {
                    $next->items()->create([
                        'salary_component_id' => $item->salary_component_id,
                        'amount' => $item->amount,
                        'percentage' => $item->percentage,
                        'sort_order' => $item->sort_order,
                    ]);
                }
            }

            $salaryStructure->forceFill(['superseded_by_id' => $next->id])->save();

            return $next;
        });

        return (new SalaryStructureResource($next->load(['items.component', 'designation'])))
            ->response()->setStatusCode(201);
    }

    /**
     * Previews the impact of applying a structure without writing anything.
     * Lets the UI warn before an accidental re-apply creates or supersedes rows.
     */
    public function applyPreview(Request $request, SalaryStructure $salaryStructure): JsonResponse
    {
        $data = $request->validate([
            'staff_member_ids' => ['nullable', 'array'],
            'staff_member_ids.*' => [
                'integer',
                Rule::exists('staff_members', 'id')
                    ->where('campus_id', $salaryStructure->campus_id)
                    ->whereNull('deleted_at'),
            ],
            'effective_from' => ['nullable', 'date'],
        ]);

        $effectiveFrom = $this->applyEffectiveFrom($salaryStructure, $data['effective_from'] ?? null);
        $members = $this->targetMembers($salaryStructure, $data['staff_member_ids'] ?? []);
        $memberIds = $members->pluck('id');

        $alreadyFromThisStructure = StaffSalary::query()
            ->whereIn('staff_member_id', $memberIds)
            ->where('salary_structure_id', $salaryStructure->id)
            ->distinct()
            ->count('staff_member_id');

        $willSupersede = StaffSalary::query()
            ->whereIn('staff_member_id', $memberIds)
            ->where('effective_from', '<', $effectiveFrom)
            ->where(fn ($q) => $q->whereNull('effective_to')->orWhereDate('effective_to', '>=', $effectiveFrom))
            ->distinct()
            ->count('staff_member_id');

        $alreadyOnThisDate = StaffSalary::query()
            ->whereIn('staff_member_id', $memberIds)
            ->whereDate('effective_from', $effectiveFrom)
            ->count();

        return response()->json([
            'data' => [
                'effective_from' => $effectiveFrom,
                'matched_staff' => $memberIds->count(),
                'already_from_this_structure' => $alreadyFromThisStructure,
                'will_supersede' => $willSupersede,
                'already_on_this_date' => $alreadyOnThisDate,
                'requires_confirmation' => $willSupersede > 0 || $alreadyFromThisStructure > 0,
                'basic_salary' => $salaryStructure->basic_salary,
                'currency' => $salaryStructure->currency,
                'staff' => $members->take(50)->map(fn (StaffMember $member) => [
                    'id' => $member->id,
                    'full_name' => $member->full_name,
                    'employee_no' => $member->employee_no,
                ])->values(),
            ],
        ]);
    }

    /**
     * Copies the structure into effective-dated staff salaries. When no staff
     * ids are supplied, every employed staff member holding the structure's
     * designation is included.
     */
    public function apply(Request $request, SalaryStructure $salaryStructure): JsonResponse
    {
        $data = $request->validate([
            'staff_member_ids' => ['nullable', 'array'],
            'staff_member_ids.*' => [
                'integer',
                Rule::exists('staff_members', 'id')
                    ->where('campus_id', $salaryStructure->campus_id)
                    ->whereNull('deleted_at'),
            ],
            'effective_from' => ['nullable', 'date'],
        ]);

        $effectiveFrom = $this->applyEffectiveFrom($salaryStructure, $data['effective_from'] ?? null);

        $members = $this->targetMembers($salaryStructure, $data['staff_member_ids'] ?? []);

        if ($members->isEmpty()) {
            throw ValidationException::withMessages([
                'staff_member_ids' => ['No staff members match this structure.'],
            ]);
        }

        $salaryStructure->load('items');

        $created = DB::transaction(function () use ($salaryStructure, $members, $effectiveFrom) {
            $applied = [];
            $service = app(SalaryAssignmentService::class);

            foreach ($members as $member) {
                $salary = $service->assignFromStructure($member, $salaryStructure, $effectiveFrom);
                $applied[] = $salary->id;
            }

            return $applied;
        });

        return response()->json([
            'message' => 'Salary structure applied.',
            'data' => [
                'salary_ids' => $created,
                'staff_count' => count($created),
            ],
        ]);
    }

    private function assertCurrent(SalaryStructure $structure): void
    {
        if (! $structure->isCurrent()) {
            throw ValidationException::withMessages([
                'structure' => ['This version has been superseded. Edit the current version instead.'],
            ]);
        }
    }

    private function applyEffectiveFrom(SalaryStructure $structure, ?string $effectiveFrom): string
    {
        return $effectiveFrom
            ?? $structure->effective_from?->toDateString()
            ?? now()->toDateString();
    }

    /**
     * @param  array<int, int>  $staffMemberIds
     * @return Collection<int, StaffMember>
     */
    private function targetMembers(SalaryStructure $structure, array $staffMemberIds): Collection
    {
        return StaffMember::query()
            ->where('campus_id', $structure->campus_id)
            ->when(
                ! empty($staffMemberIds),
                fn ($q) => $q->whereIn('id', $staffMemberIds),
                fn ($q) => $q->where('designation_id', $structure->designation_id)
                    ->whereIn('status', $this->employedStatuses())
            )
            ->orderBy('first_name')
            ->get();
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    private function syncItems(SalaryStructure $structure, array $items): void
    {
        foreach ($items as $index => $item) {
            $structure->items()->create([
                'salary_component_id' => $item['salary_component_id'],
                'amount' => $item['amount'] ?? null,
                'percentage' => $item['percentage'] ?? null,
                'sort_order' => $item['sort_order'] ?? $index,
            ]);
        }
    }

    /**
     * @return array<int, string>
     */
    private function employedStatuses(): array
    {
        return array_values(array_map(
            fn (StaffStatus $status) => $status->value,
            array_filter(StaffStatus::cases(), fn (StaffStatus $status) => $status->isEmployed()),
        ));
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, ?int $ignoreId = null, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'designation_id' => [
                $presence, 'integer',
                Rule::exists('designations', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
                Rule::unique('salary_structures', 'designation_id')
                    ->where('campus_id', $campusId)
                    ->whereNull('deleted_at')
                    ->whereNull('superseded_by_id')
                    ->ignore($ignoreId),
            ],
            'name' => [$presence, 'string', 'max:255'],
            'basic_salary' => [$presence, 'numeric', 'min:0'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'effective_from' => ['nullable', 'date'],
            'effective_to' => ['nullable', 'date', 'after_or_equal:effective_from'],
            'is_active' => ['sometimes', 'boolean'],
            'increment_type' => ['nullable', Rule::enum(SalaryIncrementType::class)],
            'increment_value' => ['nullable', 'numeric', 'min:0'],
            'increment_every_months' => ['nullable', 'integer', 'min:1', 'max:60'],
            'notes' => ['nullable', 'string'],
            'items' => ['sometimes', 'array'],
            'items.*.salary_component_id' => [
                'required', 'integer',
                Rule::exists('salary_components', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'items.*.amount' => ['nullable', 'numeric', 'min:0'],
            'items.*.percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'items.*.sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
