<?php

namespace App\Services;

use App\Models\SalaryStructure;
use App\Models\StaffMember;
use App\Models\StaffSalary;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class SalaryAssignmentService
{
    /**
     * Current structure for a designation that applies on the given date.
     */
    public function currentStructure(int $campusId, ?int $designationId, ?string $effectiveFrom = null): ?SalaryStructure
    {
        if ($designationId === null) {
            return null;
        }

        $onDate = $effectiveFrom ?? now()->toDateString();

        return SalaryStructure::query()
            ->with('items')
            ->where('campus_id', $campusId)
            ->where('designation_id', $designationId)
            ->where('is_active', true)
            ->current()
            ->where(fn ($query) => $query
                ->whereNull('effective_from')
                ->orWhereDate('effective_from', '<=', $onDate))
            ->orderByDesc('effective_from')
            ->first();
    }

    public function assignFromStructure(
        StaffMember $staff,
        SalaryStructure $structure,
        string $effectiveFrom,
        ?string $basicSalary = null,
        ?string $notes = null,
    ): StaffSalary {
        $structure->loadMissing('items');

        return $this->upsert(
            staff: $staff,
            effectiveFrom: $effectiveFrom,
            basicSalary: $basicSalary ?? $structure->basic_salary,
            currency: $structure->currency,
            structure: $structure,
            items: $structure->items->map(fn ($item) => [
                'salary_component_id' => $item->salary_component_id,
                'amount' => $item->amount,
                'percentage' => $item->percentage,
            ]),
            notes: $notes ?? "Applied from structure: {$structure->name}",
        );
    }

    public function assignManual(
        StaffMember $staff,
        string $basicSalary,
        string $effectiveFrom,
        ?string $currency = null,
        ?string $notes = null,
    ): StaffSalary {
        return $this->upsert(
            staff: $staff,
            effectiveFrom: $effectiveFrom,
            basicSalary: $basicSalary,
            currency: $currency ?? 'PKR',
            structure: null,
            items: collect(),
            notes: $notes ?? 'Set at staff appointment',
        );
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $items
     */
    private function upsert(
        StaffMember $staff,
        string $effectiveFrom,
        string $basicSalary,
        string $currency,
        ?SalaryStructure $structure,
        Collection $items,
        ?string $notes,
    ): StaffSalary {
        $dayBefore = Carbon::parse($effectiveFrom)->subDay()->toDateString();
        $structureEffectiveTo = $structure?->effective_to?->toDateString();

        $nextStart = StaffSalary::query()
            ->where('staff_member_id', $staff->id)
            ->where('effective_from', '>', $effectiveFrom)
            ->min('effective_from');

        $effectiveTo = $structureEffectiveTo;

        if ($nextStart !== null) {
            $cap = Carbon::parse($nextStart)->subDay()->toDateString();
            $effectiveTo = $effectiveTo === null || $cap < $effectiveTo ? $cap : $effectiveTo;
        }

        StaffSalary::query()
            ->where('staff_member_id', $staff->id)
            ->where('effective_from', '<', $effectiveFrom)
            ->where(fn ($query) => $query
                ->whereNull('effective_to')
                ->orWhereDate('effective_to', '>=', $effectiveFrom))
            ->update(['effective_to' => $dayBefore]);

        $salary = StaffSalary::updateOrCreate(
            [
                'staff_member_id' => $staff->id,
                'effective_from' => $effectiveFrom,
            ],
            [
                'institution_id' => $staff->institution_id,
                'campus_id' => $staff->campus_id,
                'salary_structure_id' => $structure?->id,
                'basic_salary' => $basicSalary,
                'currency' => $currency,
                'effective_to' => $effectiveTo,
                'is_active' => true,
                'notes' => $notes,
            ],
        );

        $salary->items()->delete();

        foreach ($items as $item) {
            $salary->items()->create($item);
        }

        return $salary;
    }
}
