<?php

namespace App\Services\Scholarships;

use App\Enums\ScholarshipAwardStatus;
use App\Enums\ScholarshipDiscountType;
use App\Models\ScholarshipAward;
use App\Models\StudentEnrollment;

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
}
