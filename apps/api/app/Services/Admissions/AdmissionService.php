<?php

namespace App\Services\Admissions;

use App\Enums\AdmissionStatus;
use App\Enums\EnrollmentStatus;
use App\Enums\StudentStatus;
use App\Models\Admission;
use App\Models\Guardian;
use App\Models\Section;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Turns an approved admission into a student record, guardian link and
 * enrollment. Numbering is campus-scoped.
 */
class AdmissionService
{
    public function nextApplicationNo(int $campusId): string
    {
        return $this->nextNumber($campusId, 'APP');
    }

    public function enroll(Admission $admission, User $user, array $attributes): Student
    {
        if (! $admission->isEnrolled() && $admission->status !== AdmissionStatus::Approved) {
            throw ValidationException::withMessages([
                'status' => ['Only approved admissions can be enrolled.'],
            ]);
        }

        $sectionId = $attributes['section_id'] ?? null;

        if ($sectionId !== null) {
            $belongs = Section::query()
                ->whereKey($sectionId)
                ->where('class_room_id', $attributes['class_room_id'])
                ->exists();

            if (! $belongs) {
                throw ValidationException::withMessages([
                    'section_id' => ['The selected section does not belong to the selected class.'],
                ]);
            }
        }

        return DB::transaction(function () use ($admission, $user, $attributes, $sectionId) {
            $student = Student::create([
                'institution_id' => $admission->institution_id,
                'campus_id' => $admission->campus_id,
                'admission_no' => $attributes['admission_no'] ?? $this->nextAdmissionNo($admission->campus_id),
                'first_name' => $admission->first_name,
                'last_name' => $admission->last_name,
                'gender' => $admission->gender,
                'date_of_birth' => $admission->date_of_birth,
                'email' => $admission->guardian_email,
                'phone' => $admission->guardian_phone,
                'address' => $admission->address,
                'city' => $admission->city,
                'previous_school' => $admission->previous_school,
                'admission_date' => $attributes['admission_date'] ?? now()->toDateString(),
                'status' => StudentStatus::Active,
                'notes' => $admission->notes,
            ]);

            if ($admission->guardian_name !== null) {
                $guardian = Guardian::firstOrCreate(
                    [
                        'campus_id' => $admission->campus_id,
                        'phone' => $admission->guardian_phone ?? $admission->guardian_email ?? $admission->guardian_name,
                    ],
                    [
                        'institution_id' => $admission->institution_id,
                        'name' => $admission->guardian_name,
                        'email' => $admission->guardian_email,
                        'phone' => $admission->guardian_phone,
                    ]
                );

                $student->guardians()->syncWithoutDetaching([
                    $guardian->id => [
                        'relationship' => $admission->guardian_relation ?? 'guardian',
                        'is_primary' => true,
                        'is_emergency_contact' => true,
                    ],
                ]);
            }

            StudentEnrollment::create([
                'institution_id' => $admission->institution_id,
                'campus_id' => $admission->campus_id,
                'student_id' => $student->id,
                'academic_year_id' => $attributes['academic_year_id'],
                'class_room_id' => $attributes['class_room_id'],
                'section_id' => $sectionId,
                'roll_number' => $attributes['roll_number'] ?? null,
                'status' => EnrollmentStatus::Active,
                'starts_on' => $attributes['starts_on'] ?? now()->toDateString(),
            ]);

            $admission->forceFill([
                'status' => AdmissionStatus::Enrolled,
                'student_id' => $student->id,
                'decided_on' => now()->toDateString(),
                'decided_by' => $user->id,
            ])->save();

            return $student;
        });
    }

    private function nextAdmissionNo(int $campusId): string
    {
        $sequence = Student::withTrashed()->where('campus_id', $campusId)->count() + 1;

        do {
            $number = sprintf('ADM-%05d', $sequence);
            $sequence++;
        } while (Student::withTrashed()->where('campus_id', $campusId)->where('admission_no', $number)->exists());

        return $number;
    }

    private function nextNumber(int $campusId, string $prefix): string
    {
        $sequence = Admission::withTrashed()->where('campus_id', $campusId)->count() + 1;

        do {
            $number = sprintf('%s-%05d', $prefix, $sequence);
            $sequence++;
        } while (Admission::withTrashed()->where('campus_id', $campusId)->where('application_no', $number)->exists());

        return $number;
    }
}
