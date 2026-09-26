<?php

namespace App\Services\Concessions;

use App\Enums\ConcessionStatus;
use App\Enums\DiscountType;
use App\Enums\StudentStatus;
use App\Models\Concession;
use App\Models\ConcessionPolicy;
use App\Models\FeePlan;
use App\Models\Student;
use App\Models\StudentEnrollment;
use Illuminate\Support\Collection;

/**
 * Evaluates campus concession policies into per-student fee discounts.
 *
 * Policies marked "requires_approval" only apply through an approved
 * Concession grant; other active policies are matched on the fly.
 */
class ConcessionService
{
    /**
     * Annual concession for a single student, capped at the annual gross.
     */
    public function annualConcessionFor(int $studentId, int $academicYearId, int $classRoomId, float $annualGross): float
    {
        if ($annualGross <= 0) {
            return 0.0;
        }

        $student = Student::query()->with('guardians')->find($studentId);

        if ($student === null) {
            return 0.0;
        }

        return $this->evaluate(
            $student,
            $this->policiesFor($academicYearId, $classRoomId),
            $annualGross,
            $this->approvedGrants($studentId, $academicYearId),
        );
    }

    /**
     * Merge concession-derived discounts into an explicit discount map.
     * Explicit entries always win.
     *
     * @param  array<int|string, float|int>  $discounts  keyed by student id
     * @return array<int|string, float>
     */
    public function applyToDiscounts(int $academicYearId, int $classRoomId, float $annualGross, array $discounts): array
    {
        if ($annualGross <= 0) {
            return $discounts;
        }

        $studentIds = StudentEnrollment::query()
            ->where('academic_year_id', $academicYearId)
            ->where('class_room_id', $classRoomId)
            ->where('status', 'active')
            ->pluck('student_id')
            ->unique();

        if ($studentIds->isEmpty()) {
            return $discounts;
        }

        $policies = $this->policiesFor($academicYearId, $classRoomId);
        $students = Student::query()->with('guardians')->whereIn('id', $studentIds)->get()->keyBy('id');
        $grants = Concession::query()
            ->where('academic_year_id', $academicYearId)
            ->where('status', ConcessionStatus::Approved->value)
            ->get()
            ->groupBy('student_id');

        foreach ($studentIds as $studentId) {
            $studentId = (int) $studentId;

            if (array_key_exists($studentId, $discounts)) {
                continue;
            }

            $student = $students->get($studentId);

            if ($student === null) {
                continue;
            }

            $amount = $this->evaluate($student, $policies, $annualGross, $grants->get($studentId, new Collection));

            if ($amount > 0) {
                $discounts[$studentId] = $amount;
            }
        }

        return $discounts;
    }

    /**
     * Annual gross from the student's fee plan for the year, used to resolve
     * percentage-based concessions at approval time.
     */
    public function annualGrossFor(int $studentId, int $academicYearId): float
    {
        $classRoomId = StudentEnrollment::query()
            ->where('student_id', $studentId)
            ->where('academic_year_id', $academicYearId)
            ->where('status', 'active')
            ->value('class_room_id');

        if ($classRoomId === null) {
            return 0.0;
        }

        $plan = FeePlan::query()
            ->where('academic_year_id', $academicYearId)
            ->where('class_room_id', $classRoomId)
            ->first();

        if ($plan === null) {
            return 0.0;
        }

        return round((float) $plan->items()->where('is_optional', false)->sum('amount'), 2);
    }

    /**
     * Resolve a policy's discount against an annual gross, applying the cap.
     */
    public function amountFor(ConcessionPolicy $policy, float $annualGross): float
    {
        $value = (float) $policy->value;

        $amount = $policy->discount_type === DiscountType::Percentage
            ? $annualGross * $value / 100
            : $value;

        if ($policy->max_amount !== null) {
            $amount = min($amount, (float) $policy->max_amount);
        }

        return round(max($amount, 0), 2);
    }

    /**
     * Whether a student satisfies a policy's criteria.
     */
    public function matches(ConcessionPolicy $policy, Student $student): bool
    {
        $criteria = $policy->criteria ?? [];

        $genders = $criteria['gender'] ?? null;

        if (! empty($genders) && ! in_array($student->gender?->value, (array) $genders, true)) {
            return false;
        }

        $categories = $criteria['categories'] ?? null;

        if (! empty($categories) && ! in_array($student->category, (array) $categories, true)) {
            return false;
        }

        if (isset($criteria['min_siblings'])) {
            if ($this->siblingCount($student) < (int) $criteria['min_siblings']) {
                return false;
            }
        }

        return true;
    }

    /**
     * @return Collection<int, ConcessionPolicy>
     */
    private function policiesFor(int $academicYearId, int $classRoomId): Collection
    {
        return ConcessionPolicy::query()
            ->where('is_active', true)
            ->where(function ($query) use ($academicYearId) {
                $query->whereNull('academic_year_id')->orWhere('academic_year_id', $academicYearId);
            })
            ->where(function ($query) use ($classRoomId) {
                $query->whereNull('class_room_id')->orWhere('class_room_id', $classRoomId);
            })
            ->orderBy('priority')
            ->get();
    }

    /**
     * @return Collection<int, Concession>
     */
    private function approvedGrants(int $studentId, int $academicYearId): Collection
    {
        return Concession::query()
            ->where('student_id', $studentId)
            ->where('academic_year_id', $academicYearId)
            ->where('status', ConcessionStatus::Approved->value)
            ->get();
    }

    /**
     * @param  Collection<int, ConcessionPolicy>  $policies
     * @param  Collection<int, Concession>  $grants
     */
    private function evaluate(Student $student, Collection $policies, float $annualGross, Collection $grants): float
    {
        $stackable = 0.0;
        $best = 0.0;

        foreach ($policies as $policy) {
            if ($policy->requires_approval || ! $this->matches($policy, $student)) {
                continue;
            }

            $amount = $this->amountFor($policy, $annualGross);

            if ($policy->is_stackable) {
                $stackable += $amount;
            } else {
                $best = max($best, $amount);
            }
        }

        $granted = (float) $grants->sum('amount');

        return round(min($stackable + $best + $granted, $annualGross), 2);
    }

    private function siblingCount(Student $student): int
    {
        $guardianIds = $student->guardians->pluck('id');

        if ($guardianIds->isEmpty()) {
            return 0;
        }

        return Student::query()
            ->whereKeyNot($student->id)
            ->where('status', StudentStatus::Active->value)
            ->whereHas('guardians', fn ($query) => $query->whereIn('guardians.id', $guardianIds))
            ->count();
    }
}
