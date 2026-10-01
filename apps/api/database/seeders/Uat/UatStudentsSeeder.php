<?php

namespace Database\Seeders\Uat;

use App\Enums\CertificateStatus;
use App\Enums\CourseRegistrationStatus;
use App\Enums\EnrollmentStatus;
use App\Enums\Gender;
use App\Enums\GuardianRelation;
use App\Enums\RoleName;
use App\Enums\StudentStatus;
use App\Enums\WalletTransactionType;
use App\Models\AlumniProfile;
use App\Models\CourseRegistration;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\StudentCertificate;
use App\Models\StudentDocument;
use App\Models\StudentEnrollment;
use App\Models\StudentWallet;
use App\Models\User;
use App\Models\WalletTransaction;

/**
 * Seeds the student body, guardians, enrollments, student/parent logins,
 * wallets and student records (documents, certificates, alumni, course
 * registrations) for a campus.
 */
class UatStudentsSeeder extends UatSeederBase
{
    public const STUDENTS_PER_CAMPUS = 120;

    /**
     * Optional volume override for faster local runs, e.g.
     * UAT_STUDENTS_PER_CAMPUS=8. Defaults to the full UAT volume.
     */
    public static function perCampus(): int
    {
        $value = (int) env('UAT_STUDENTS_PER_CAMPUS', self::STUDENTS_PER_CAMPUS);

        return $value > 0 ? $value : self::STUDENTS_PER_CAMPUS;
    }

    public function seed(UatCampusContext $ctx): void
    {
        mt_srand((int) $ctx->campus->id + 3000);

        $pairs = $this->classSectionPairs($ctx);
        $rollBySection = [];

        for ($i = 1; $i <= self::perCampus(); $i++) {
            [$class, $section] = $pairs[($i - 1) % count($pairs)];
            $sectionKey = $section->id;
            $roll = ($rollBySection[$sectionKey] ?? 0) + 1;
            $rollBySection[$sectionKey] = $roll;

            $student = $this->student($ctx, $i, $class, $section, $roll);
            $ctx->students[] = $student;

            $this->enroll($ctx, $student, $class, $section, $roll);
            $this->wallet($ctx, $student, $i);
        }

        $this->certificatesAndAlumni($ctx);
        $this->courseRegistrations($ctx);

        $this->command?->info(sprintf(
            'UAT:   %s - %d students, %d guardians, %d student/parent logins',
            $ctx->campusCode(),
            count($ctx->students),
            count($ctx->guardians),
            count($ctx->studentUsers)
        ));
    }

    /**
     * @return array<int, array{0: \App\Models\ClassRoom, 1: \App\Models\Section}>
     */
    protected function classSectionPairs(UatCampusContext $ctx): array
    {
        $pairs = [];
        foreach ($ctx->classes as $class) {
            foreach ($ctx->sectionsFor($class->code) as $section) {
                $pairs[] = [$class, $section];
            }
        }

        return $pairs;
    }

    protected function student(
        UatCampusContext $ctx,
        int $index,
        \App\Models\ClassRoom $class,
        \App\Models\Section $section,
        int $roll
    ): Student {
        $tenant = $this->tenant($ctx->campus);
        $gender = $index % 2 === 0 ? Gender::Male : Gender::Female;
        $name = $this->person((int) $ctx->campus->id * 1000 + $index, $gender->value);
        $admissionNo = $ctx->campusCode().'-2026-'.sprintf('%04d', $index);
        $slug = strtolower($ctx->campus->code);

        $studentUser = User::firstOrCreate(
            ['email' => 'student'.$index.'.'.$slug.'@'.UatFoundationSeeder::EMAIL_DOMAIN],
            [
                'name' => $name['first_name'].' '.$name['last_name'],
                'password' => self::pw(),
                'email_verified_at' => now(),
                'phone' => $this->phone($ctx->campus, $index + 2000),
                'job_title' => 'Student',
                'institution_id' => $ctx->institution->id,
                'campus_id' => $ctx->campus->id,
                'is_active' => true,
            ]
        );
        $this->assignRole($ctx, $studentUser, RoleName::Student->value);

        $student = $this->first(Student::class, [
            'campus_id' => $ctx->campus->id,
            'admission_no' => $admissionNo,
        ], $tenant + [
            'user_id' => $studentUser->id,
            'first_name' => $name['first_name'],
            'last_name' => $name['last_name'],
            'gender' => $gender,
            'date_of_birth' => $this->day('2012-01-01', $index * 53),
            'blood_group' => $this->pick(['A+', 'B+', 'O+', 'AB+', 'A-', 'O-']),
            'nationality' => 'Pakistani',
            'religion' => 'Islam',
            'category' => $this->pick(['General', 'General', 'Merit', 'Sports']),
            'national_id' => $this->cnic($index + (int) $ctx->campus->id * 3),
            'email' => $studentUser->email,
            'phone' => $studentUser->phone,
            'address' => 'House '.$index.', '.$this->street($index).', '.$this->city($index),
            'city' => $this->city($index),
            'previous_school' => $this->pick(['City Public School', 'The Educators', 'Beaconhouse', 'Government High School', 'Army Public School']),
            'admission_date' => $ctx->year->starts_on,
            'status' => StudentStatus::Active,
        ]);

        $ctx->studentUsers[$admissionNo] = $studentUser;

        $this->guardian($ctx, $student, $index, $name['last_name'], $gender);

        return $student;
    }

    protected function guardian(UatCampusContext $ctx, Student $student, int $index, string $lastName, Gender $studentGender): void
    {
        $tenant = $this->tenant($ctx->campus);
        $slug = strtolower($ctx->campus->code);
        $guardianUser = User::firstOrCreate(
            ['email' => 'parent'.$index.'.'.$slug.'@'.UatFoundationSeeder::EMAIL_DOMAIN],
            [
                'name' => 'Guardian of '.$student->first_name.' '.$lastName,
                'password' => self::pw(),
                'email_verified_at' => now(),
                'phone' => $this->phone($ctx->campus, $index + 4000),
                'job_title' => 'Parent / Guardian',
                'institution_id' => $ctx->institution->id,
                'campus_id' => $ctx->campus->id,
                'is_active' => true,
            ]
        );
        $this->assignRole($ctx, $guardianUser, RoleName::ParentGuardian->value);

        $guardian = $this->first(Guardian::class, [
            'campus_id' => $ctx->campus->id,
            'phone' => $guardianUser->phone,
        ], $tenant + [
            'user_id' => $guardianUser->id,
            'name' => 'Guardian '.$student->first_name.' '.$lastName,
            'national_id' => $this->cnic($index + 777),
            'occupation' => $this->pick(['Engineer', 'Doctor', 'Businessman', 'Teacher', 'Civil Servant', 'Army Officer', 'Shopkeeper']),
            'email' => $guardianUser->email,
            'alternate_phone' => $this->phone($ctx->campus, $index + 6000),
            'address' => 'House '.$index.', '.$this->street($index).', '.$this->city($index),
        ]);

        $ctx->guardians[] = $guardian;

        $relationship = $studentGender === Gender::Male ? GuardianRelation::Father : GuardianRelation::Father;

        $student->guardians()->syncWithoutDetaching([
            $guardian->id => [
                'relationship' => $relationship->value,
                'is_primary' => true,
                'is_emergency_contact' => true,
            ],
        ]);
    }

    protected function enroll(
        UatCampusContext $ctx,
        Student $student,
        \App\Models\ClassRoom $class,
        \App\Models\Section $section,
        int $roll
    ): void {
        $enrollment = $this->first(StudentEnrollment::class, [
            'student_id' => $student->id,
            'academic_year_id' => $ctx->year->id,
        ], $this->tenant($ctx->campus) + [
            'class_room_id' => $class->id,
            'section_id' => $section->id,
            'roll_number' => (string) $roll,
            'status' => EnrollmentStatus::Active,
            'starts_on' => $ctx->year->starts_on,
        ]);

        $ctx->enrollments[$student->id] = $enrollment;
    }

    protected function wallet(UatCampusContext $ctx, Student $student, int $index): void
    {
        $tenant = $this->tenant($ctx->campus);
        $topUp = 2000 + ($index % 8) * 500;
        $spend = 300 + ($index % 5) * 120;
        $balance = $this->decimal($topUp - $spend);

        $wallet = $this->first(StudentWallet::class, [
            'student_id' => $student->id,
        ], $tenant + [
            'balance' => $balance,
            'daily_limit' => 1000,
            'low_balance_threshold' => 200,
            'is_active' => true,
        ]);

        $ctx->wallets[$student->id] = $wallet;

        $baseDate = '2026-09-01';
        WalletTransaction::firstOrCreate(
            [
                'student_wallet_id' => $wallet->id,
                'transaction_date' => $baseDate,
                'type' => WalletTransactionType::TopUp->value,
                'reference' => 'WT-'.$ctx->campusCode().'-'.$index.'-TOP',
            ],
            $tenant + [
                'amount' => $topUp,
                'balance_after' => $topUp,
                'description' => 'Wallet top-up at counter',
                'recorded_by' => $ctx->role('canteen_manager')?->id,
            ]
        );

        WalletTransaction::firstOrCreate(
            [
                'student_wallet_id' => $wallet->id,
                'transaction_date' => $this->day($baseDate, 2),
                'type' => WalletTransactionType::Purchase->value,
                'reference' => 'WT-'.$ctx->campusCode().'-'.$index.'-PUR',
            ],
            $tenant + [
                'amount' => $spend,
                'balance_after' => $balance,
                'description' => 'Canteen purchase',
                'recorded_by' => $ctx->role('canteen_manager')?->id,
            ]
        );
    }

    protected function certificatesAndAlumni(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);

        foreach ($ctx->students as $index => $student) {
            if ($index % 10 !== 0) {
                continue;
            }

            $this->first(StudentCertificate::class, [
                'student_id' => $student->id,
                'type' => 'character',
            ], $tenant + [
                'title' => 'Character Certificate',
                'serial_no' => 'CERT-'.$ctx->campusCode().'-'.sprintf('%04d', $index),
                'issued_on' => '2026-06-30',
                'status' => CertificateStatus::Issued,
                'issued_by' => $ctx->role('principal')?->id,
                'remarks' => 'Good conduct.',
            ]);

            StudentDocument::firstOrCreate(
                ['student_id' => $student->id, 'title' => 'Birth Certificate'],
                $tenant + [
                    'type' => 'birth_certificate',
                    'file_path' => 'uat/students/'.$student->id.'-birth.pdf',
                    'original_name' => 'birth-certificate.pdf',
                    'mime_type' => 'application/pdf',
                    'size' => 82000,
                    'is_verified' => true,
                    'verified_at' => now(),
                ]
            );
        }

        foreach (array_slice($ctx->students, 0, 4) as $index => $student) {
            AlumniProfile::firstOrCreate(
                ['campus_id' => $ctx->campus->id, 'full_name' => $student->first_name.' '.$student->last_name],
                $tenant + [
                    'student_id' => null,
                    'graduation_year' => '2025',
                    'current_occupation' => $this->pick(['Software Engineer', 'Doctor', 'Entrepreneur', 'Civil Servant']),
                    'employer' => $this->pick(['Systems Ltd', 'Aga Khan University', 'Self-employed', 'Government of Pakistan']),
                    'email' => 'alumni'.$index.'.'.strtolower($ctx->campus->code).'@'.UatFoundationSeeder::EMAIL_DOMAIN,
                    'phone' => $this->phone($ctx->campus, 8000 + $index),
                    'city' => $this->city($index),
                    'notes' => 'Distinguished alumnus.',
                ]
            );
        }
    }

    protected function courseRegistrations(UatCampusContext $ctx): void
    {
        if (! $ctx->campus->credit_hours_enabled) {
            return;
        }

        $tenant = $this->tenant($ctx->campus);
        $subjects = array_values($ctx->subjects);
        $term = $ctx->terms[0];

        foreach ($ctx->students as $index => $student) {
            $enrollment = $ctx->enrollments[$student->id] ?? null;

            foreach (array_slice($subjects, 0, 4) as $subject) {
                CourseRegistration::firstOrCreate(
                    [
                        'student_id' => $student->id,
                        'term_id' => $term->id,
                        'subject_id' => $subject->id,
                    ],
                    $tenant + [
                        'class_room_id' => $enrollment?->class_room_id,
                        'credit_hours' => $subject->credit_hours ?? 3,
                        'status' => CourseRegistrationStatus::Registered,
                        'registered_on' => $ctx->year->starts_on,
                    ]
                );
            }
        }
    }
}
