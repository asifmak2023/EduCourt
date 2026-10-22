<?php

namespace App\Services\Scholarships;

use App\Enums\BillingKind;
use App\Enums\ScholarshipAwardStatus;
use App\Enums\ScholarshipDiscountType;
use App\Models\FeePlan;
use App\Models\FeeStructure;
use App\Models\ScholarshipAward;
use App\Models\StudentEnrollment;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Computes scholarship discounts for students and feeds them into fee billing.
 */
class ScholarshipService
{
    /**
     * Annual discount for a student, capped at the annual gross.
     */
    public function annualDiscountFor(int $studentId, int $academicYearId, float $annualGross): float
    {
        if ($annualGross <= 0) {
            return 0.0;
        }

        $awards = ScholarshipAward::query()
            ->with('scholarship')
            ->where('student_id', $studentId)
            ->where('status', ScholarshipAwardStatus::Active->value)
            ->where(function ($query) use ($academicYearId) {
                $query->whereNull('academic_year_id')->orWhere('academic_year_id', $academicYearId);
            })
            ->get();

        $total = 0.0;

        foreach ($awards as $award) {
            $scholarship = $award->scholarship;

            if ($scholarship === null || ! $scholarship->is_active) {
                continue;
            }

            $value = $award->value_override !== null
                ? (float) $award->value_override
                : (float) $scholarship->value;

            $total += $scholarship->discount_type === ScholarshipDiscountType::Percentage
                ? $annualGross * $value / 100
                : $value;
        }

        return round(min($total, $annualGross), 2);
    }

    /**
     * Merge scholarship-derived discounts into an explicit discount map.
     * Explicit entries always win.
     *
     * @param  array<int|string, float|int>  $discounts  keyed by student id
     * @return array<int|string, float>
     */
    public function applyToDiscounts(int $academicYearId, int $classRoomId, float $annualGross, array $discounts): array
    {
        $studentIds = StudentEnrollment::query()
            ->where('academic_year_id', $academicYearId)
            ->where('class_room_id', $classRoomId)
            ->where('status', 'active')
            ->pluck('student_id')
            ->unique();

        foreach ($studentIds as $studentId) {
            if (array_key_exists($studentId, $discounts)) {
                continue;
            }

            $amount = $this->annualDiscountFor((int) $studentId, $academicYearId, $annualGross);

            if ($amount > 0) {
                $discounts[$studentId] = $amount;
            }
        }

        return $discounts;
    }

    /**
     * Money awarded for one grant, converting percentage schemes from the student's fees.
     */
    public function awardedAmountFor(ScholarshipAward $award): float
    {
        $award->loadMissing(['scholarship', 'academicYear']);

        $scholarship = $award->scholarship;

        if ($scholarship === null) {
            return 0.0;
        }

        $value = $award->value_override !== null
            ? (float) $award->value_override
            : (float) $scholarship->value;

        if ($scholarship->discount_type !== ScholarshipDiscountType::Percentage) {
            return round(max($value, 0), 2);
        }

        $gross = $this->feeGrossFor($award);

        return round(max($gross * $value / 100, 0), 2);
    }

    /**
     * @param  Collection<int, ScholarshipAward>  $awards
     */
    public function attachAwardedAmounts(Collection $awards): void
    {
        $awards->loadMissing(['scholarship', 'academicYear']);

        foreach ($awards as $award) {
            $award->setAttribute('awarded_amount', $this->awardedAmountFor($award));
        }
    }

    private function feeGrossFor(ScholarshipAward $award): float
    {
        $yearId = $award->academic_year_id;

        $enrollment = StudentEnrollment::query()
            ->where('student_id', $award->student_id)
            ->when($yearId, fn ($query) => $query->where('academic_year_id', $yearId))
            ->where('status', 'active')
            ->orderByDesc('id')
            ->first();

        if ($enrollment === null) {
            return 0.0;
        }

        $yearId = $enrollment->academic_year_id;

        $structure = FeeStructure::query()
            ->with('items')
            ->where('academic_year_id', $yearId)
            ->where('class_room_id', $enrollment->class_room_id)
            ->where('is_active', true)
            ->first();

        if ($structure !== null) {
            $items = $structure->items
                ->where('is_active', true)
                ->where('is_optional', false);

            $monthly = (float) $items->where('billing_kind', BillingKind::Monthly)->sum('amount');
            $other = (float) $items->where('billing_kind', '!=', BillingKind::Monthly)->sum('amount');
            $months = $this->coveredMonths($award);

            return round(($monthly * $months) + $other, 2);
        }

        $plan = FeePlan::query()
            ->where('academic_year_id', $yearId)
            ->where('class_room_id', $enrollment->class_room_id)
            ->first();

        if ($plan === null) {
            return 0.0;
        }

        return round((float) $plan->items()->where('is_optional', false)->sum('amount'), 2);
    }

    private function coveredMonths(ScholarshipAward $award): int
    {
        $start = $award->starts_on
            ?? $award->awarded_on
            ?? $award->academicYear?->starts_on;

        $end = $award->ends_on ?? $award->academicYear?->ends_on;

        if ($start === null || $end === null) {
            return 12;
        }

        $from = Carbon::parse($start)->startOfMonth();
        $to = Carbon::parse($end)->startOfMonth();

        if ($to->lt($from)) {
            return 0;
        }

        return $from->diffInMonths($to) + 1;
    }
}
