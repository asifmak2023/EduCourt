<?php

namespace Database\Seeders\TestInstitute;

use App\Enums\AttendanceStatus;
use App\Enums\BillingKind;
use App\Enums\BookIssueStatus;
use App\Enums\CircularAudience;
use App\Enums\CircularStatus;
use App\Enums\ConductCategory;
use App\Enums\ConductSeverity;
use App\Enums\ConductStatus;
use App\Enums\EnrollmentStatus;
use App\Enums\ExamStatus;
use App\Enums\Gender;
use App\Enums\GuardianRelation;
use App\Enums\RoleName;
use App\Enums\StudentStatus;
use App\Enums\SubjectType;
use App\Enums\VehicleType;
use App\Models\AcademicYear;
use App\Models\Book;
use App\Models\BookIssue;
use App\Models\Campus;
use App\Models\Circular;
use App\Models\ClassRoom;
use App\Models\ClassSubject;
use App\Models\ConductRecord;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Exam;
use App\Models\ExamMark;
use App\Models\ExamPaper;
use App\Models\ExamType;
use App\Models\FeeHead;
use App\Models\FeePayment;
use App\Models\FeePlan;
use App\Models\FeeReceipt;
use App\Models\FeeStructure;
use App\Models\FeeStructureItem;
use App\Models\FeeVoucher;
use App\Models\GradeScale;
use App\Models\GradeScaleItem;
use App\Models\Guardian;
use App\Models\Institution;
use App\Models\Period;
use App\Models\Room;
use App\Models\Section;
use App\Models\StaffMember;
use App\Models\Stage;
use App\Models\Student;
use App\Models\StudentAttendance;
use App\Models\StudentEnrollment;
use App\Models\Subject;
use App\Models\TeachingAssignment;
use App\Models\Term;
use App\Models\TimetableSlot;
use App\Models\TransportAllocation;
use App\Models\TransportRoute;
use App\Models\TransportRouteStop;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\Fees\FeeCounterService;
use Database\Seeders\RbacSeeder;
use Database\Seeders\Uat\UatCampusContext;
use Database\Seeders\Uat\UatSeederBase;
use Illuminate\Support\Carbon;

/**
 * Builds a small, fully wired demo/test institute: one tenant with two
 * campuses, two campus administrators, two teachers, two students and their
 * parents, plus ~2 records per operational module.
 *
 * Usage:
 *   php artisan db:seed --class="Database\Seeders\TestInstitute\EduCourtTestInstituteSeeder"
 *
 * The seeder is additive and idempotent; it never deletes existing data.
 */
class EduCourtTestInstituteSeeder extends UatSeederBase
{
    public const INSTITUTION_CODE = 'EDCTEST';

    public const EMAIL_DOMAIN = 'test.educourt.test';

    /**
     * @return array<int, array<string, string>>
     */
    public static function campuses(): array
    {
        return [
            [
                'name' => 'EduCourt Test Institute - Main Campus',
                'code' => 'EDCT-MAIN',
                'city' => 'Lahore',
                'address' => '12 Main Boulevard, Gulberg III, Lahore',
                'admin_email' => 'campusadmin.main@'.self::EMAIL_DOMAIN,
                'teacher_email' => 'teacher.main@'.self::EMAIL_DOMAIN,
                'student_email' => 'student.main@'.self::EMAIL_DOMAIN,
                'student_name' => 'Hamza Test',
                'student_gender' => Gender::Male->value,
                'father_email' => 'parent.main.father@'.self::EMAIL_DOMAIN,
                'mother_email' => 'parent.main.mother@'.self::EMAIL_DOMAIN,
                'family_name' => 'Test',
            ],
            [
                'name' => 'EduCourt Test Institute - City Campus',
                'code' => 'EDCT-CITY',
                'city' => 'Karachi',
                'address' => '45 Airport Road, Karachi',
                'admin_email' => 'campusadmin.city@'.self::EMAIL_DOMAIN,
                'teacher_email' => 'teacher.city@'.self::EMAIL_DOMAIN,
                'student_email' => 'student.city@'.self::EMAIL_DOMAIN,
                'student_name' => 'Ayesha Test',
                'student_gender' => Gender::Female->value,
                'father_email' => 'parent.city.father@'.self::EMAIL_DOMAIN,
                'mother_email' => 'parent.city.mother@'.self::EMAIL_DOMAIN,
                'family_name' => 'Test',
            ],
        ];
    }

    public function run(): void
    {
        $this->command?->info('TEST INSTITUTE: seeding EduCourt Test Institute');

        $this->call(RbacSeeder::class);

        $platformAdmin = $this->platformAdmin();

        $institution = Institution::firstOrCreate(
            ['code' => self::INSTITUTION_CODE],
            [
                'name' => 'EduCourt Test Institute',
                'legal_name' => 'EduCourt Test Institute (Registered)',
                'email' => 'info@'.self::EMAIL_DOMAIN,
                'phone' => '+92-42-111-999-000',
                'website' => 'https://'.self::EMAIL_DOMAIN,
                'address' => '12 Main Boulevard, Gulberg III, Lahore',
                'is_active' => true,
                'plan' => 'standard',
                'status' => 'active',
                'max_campuses' => 5,
            ]
        );

        foreach (self::campuses() as $fixture) {
            $campus = Campus::firstOrCreate(
                ['institution_id' => $institution->id, 'code' => $fixture['code']],
                [
                    'name' => $fixture['name'],
                    'type' => 'school',
                    'email' => strtolower($fixture['code']).'@'.self::EMAIL_DOMAIN,
                    'phone' => '+92-42-111-999-'.substr($fixture['code'], -4),
                    'whatsapp' => '+92-300-1112223',
                    'website' => 'https://'.strtolower($fixture['code']).'.'.self::EMAIL_DOMAIN,
                    'address' => $fixture['address'],
                    'is_active' => true,
                    'academic_model' => 'school',
                    'term_system' => 'terms',
                    'grading_system' => 'percentage',
                    'credit_hours_enabled' => false,
                ]
            );

            $ctx = new UatCampusContext($institution, $campus);
            $ctx->platformAdmin = $platformAdmin;
            $ctx->campusAdmin = $this->campusAdmin($ctx, $fixture);

            $this->academics($ctx, $fixture);
            $this->teachers($ctx, $fixture);
            $student = $this->student($ctx, $fixture);

            $this->attendance($ctx, $student);
            $this->fees($ctx, $fixture, $student);
            $this->exams($ctx, $student);
            $this->library($ctx, $student);
            $this->transport($ctx, $student);
            $this->conduct($ctx, $student);
            $this->circulars($ctx);

            $this->command?->info(sprintf('TEST INSTITUTE: %s seeded', $campus->code));
        }

        $this->command?->info('TEST INSTITUTE: ===== done =====');
    }

    /**
     * Reuse an existing platform administrator for scope grants, creating a
     * dedicated one only when the database has none.
     */
    protected function platformAdmin(): ?User
    {
        $existing = User::role(RoleName::PlatformAdmin->value)->first();

        if ($existing !== null) {
            return $existing;
        }

        $user = User::firstOrCreate(
            ['email' => 'superadmin@'.self::EMAIL_DOMAIN],
            [
                'name' => 'Test Institute Super Admin',
                'password' => self::pw(),
                'email_verified_at' => now(),
                'job_title' => 'Platform Super User',
                'is_active' => true,
            ]
        );

        $user->syncRoles([RoleName::PlatformAdmin->value]);

        return $user;
    }

    /**
     * @param  array<string, string>  $fixture
     */
    protected function campusAdmin(UatCampusContext $ctx, array $fixture): User
    {
        $user = User::firstOrCreate(
            ['email' => $fixture['admin_email']],
            [
                'name' => $fixture['name'].' Administrator',
                'password' => self::pw(),
                'email_verified_at' => now(),
                'phone' => $this->phone($ctx->campus, 1),
                'job_title' => 'Campus Administrator',
                'institution_id' => $ctx->institution->id,
                'campus_id' => $ctx->campus->id,
                'is_active' => true,
            ]
        );

        $this->assignRole($ctx, $user, RoleName::CampusAdmin->value);

        return $user;
    }

    /**
     * @param  array<string, string>  $fixture
     */
    protected function academics(UatCampusContext $ctx, array $fixture): void
    {
        $tenant = $this->tenant($ctx->campus);

        $ctx->year = $this->first(AcademicYear::class, [
            'campus_id' => $ctx->campus->id,
            'name' => '2026-2027',
        ], $tenant + [
            'code' => 'AY-2026',
            'starts_on' => '2026-04-01',
            'ends_on' => '2027-03-31',
            'status' => 'active',
            'is_current' => true,
        ]);

        $terms = [
            ['Term 1', 1, '2026-04-01', '2026-08-31'],
            ['Term 2', 2, '2026-09-01', '2026-12-31'],
        ];
        $ctx->terms = [];
        foreach ($terms as $i => [$name, $sequence, $from, $to]) {
            $ctx->terms[] = $this->first(Term::class, [
                'academic_year_id' => $ctx->year->id,
                'name' => $name,
            ], $tenant + [
                'sequence' => $sequence,
                'starts_on' => $from,
                'ends_on' => $to,
                'is_current' => $i === 0,
            ]);
        }

        $stage = $this->first(Stage::class, [
            'campus_id' => $ctx->campus->id,
            'code' => 'PRI',
        ], $tenant + [
            'name' => 'Primary',
            'sequence' => 1,
            'is_active' => true,
        ]);

        $ctx->classes = [];
        $ctx->sections = [];
        $classes = [
            ['Class 1', 'C1', 1],
            ['Class 2', 'C2', 2],
        ];
        foreach ($classes as [$name, $code, $sequence]) {
            $class = $this->first(ClassRoom::class, [
                'campus_id' => $ctx->campus->id,
                'code' => $code,
            ], $tenant + [
                'stage_id' => $stage->id,
                'name' => $name,
                'sequence' => $sequence,
                'capacity' => 40,
                'is_active' => true,
            ]);

            $ctx->classes[$code] = $class;
            $ctx->sections[$code] = [];

            foreach (['A', 'B'] as $sectionName) {
                $ctx->sections[$code][] = $this->first(Section::class, [
                    'class_room_id' => $class->id,
                    'name' => $sectionName,
                ], $tenant + [
                    'capacity' => 30,
                    'is_active' => true,
                ]);
            }
        }

        $ctx->subjects = [];
        $subjects = [
            ['Mathematics', 'MATH'],
            ['Computer Science', 'COMP'],
        ];
        foreach ($subjects as [$name, $code]) {
            $ctx->subjects[$code] = $this->first(Subject::class, [
                'campus_id' => $ctx->campus->id,
                'code' => $code,
            ], $tenant + [
                'name' => $name,
                'type' => SubjectType::Core->value,
                'credit_hours' => 3,
                'weekly_periods' => 4,
                'is_active' => true,
            ]);
        }

        foreach ($ctx->classes as $class) {
            foreach ($ctx->subjects as $subject) {
                ClassSubject::firstOrCreate(
                    [
                        'academic_year_id' => $ctx->year->id,
                        'class_room_id' => $class->id,
                        'subject_id' => $subject->id,
                    ],
                    $tenant + [
                        'is_elective' => false,
                        'weekly_periods' => 4,
                        'is_active' => true,
                    ]
                );
            }
        }

        $periods = [
            ['Period 1', 1, '08:00:00', '08:45:00'],
            ['Period 2', 2, '08:45:00', '09:30:00'],
        ];
        foreach ($periods as [$name, $sequence, $start, $end]) {
            $this->first(Period::class, [
                'campus_id' => $ctx->campus->id,
                'sequence' => $sequence,
            ], $tenant + [
                'name' => $name,
                'starts_at' => $start,
                'ends_at' => $end,
                'is_break' => false,
                'is_active' => true,
            ]);
        }

        foreach (['R-01', 'R-02'] as $i => $code) {
            $this->first(Room::class, [
                'campus_id' => $ctx->campus->id,
                'code' => $code,
            ], $tenant + [
                'name' => 'Room '.($i + 1),
                'block' => 'Block A',
                'floor' => '0',
                'type' => 'classroom',
                'capacity' => 30,
                'is_active' => true,
            ]);
        }

        $this->command?->info(sprintf('TEST INSTITUTE: %s academics ready', $fixture['code']));
    }

    /**
     * @param  array<string, string>  $fixture
     */
    protected function teachers(UatCampusContext $ctx, array $fixture): void
    {
        $tenant = $this->tenant($ctx->campus);

        $department = $this->first(Department::class, [
            'campus_id' => $ctx->campus->id,
            'code' => 'ACA',
        ], $tenant + [
            'name' => 'Academics',
            'description' => 'Academic department',
            'is_active' => true,
        ]);

        $designation = $this->first(Designation::class, [
            'campus_id' => $ctx->campus->id,
            'code' => 'TEACHER',
        ], $tenant + [
            'department_id' => $department->id,
            'name' => 'Teacher',
            'grade' => 'B2',
            'is_active' => true,
        ]);

        [$first, $last] = array_pad(explode(' ', 'Sara '.$fixture['family_name']), 2, '');

        $user = User::firstOrCreate(
            ['email' => $fixture['teacher_email']],
            [
                'name' => $first.' '.$last,
                'password' => self::pw(),
                'email_verified_at' => now(),
                'phone' => $this->phone($ctx->campus, 11),
                'employee_code' => $fixture['code'].'-T-001',
                'job_title' => 'Teacher',
                'institution_id' => $ctx->institution->id,
                'campus_id' => $ctx->campus->id,
                'is_active' => true,
            ]
        );

        $this->assignRole($ctx, $user, RoleName::Teacher->value);
        $ctx->teachers = [$user];
        $ctx->users[RoleName::Teacher->value] = $user;

        $staff = StaffMember::firstOrCreate(
            ['campus_id' => $ctx->campus->id, 'employee_no' => $fixture['code'].'-EMP-001'],
            $tenant + [
                'user_id' => $user->id,
                'department_id' => $department->id,
                'designation_id' => $designation->id,
                'first_name' => $first,
                'last_name' => $last,
                'gender' => 'female',
                'phone' => $user->phone,
                'email' => $user->email,
                'employment_type' => 'permanent',
                'status' => 'active',
                'joining_date' => '2026-04-01',
            ]
        );

        $ctx->staff[] = $staff;
        $ctx->staffByUser[$user->id] = $staff;

        $section = $ctx->sections['C1'][0];
        foreach ($ctx->classes as $class) {
            foreach ($ctx->subjects as $subject) {
                TeachingAssignment::firstOrCreate(
                    [
                        'academic_year_id' => $ctx->year->id,
                        'teacher_user_id' => $user->id,
                        'subject_id' => $subject->id,
                        'class_room_id' => $class->id,
                        'section_id' => $section->id,
                    ],
                    $tenant + ['weekly_periods' => 4, 'is_active' => true]
                );
            }
        }

        $periods = Period::query()
            ->where('campus_id', $ctx->campus->id)
            ->orderBy('sequence')
            ->get();
        $room = Room::query()->where('campus_id', $ctx->campus->id)->orderBy('code')->first();
        $subjects = array_values($ctx->subjects);

        foreach ($periods as $index => $period) {
            TimetableSlot::firstOrCreate(
                [
                    'class_room_id' => $ctx->classes['C1']->id,
                    'section_id' => $section->id,
                    'period_id' => $period->id,
                    'day_of_week' => 1,
                ],
                $tenant + [
                    'academic_year_id' => $ctx->year->id,
                    'term_id' => $ctx->terms[0]->id,
                    'subject_id' => $subjects[$index % count($subjects)]->id,
                    'teacher_user_id' => $user->id,
                    'room_id' => $room?->id,
                    'is_published' => true,
                ]
            );
        }
    }

    /**
     * @param  array<string, string>  $fixture
     */
    protected function student(UatCampusContext $ctx, array $fixture): Student
    {
        $tenant = $this->tenant($ctx->campus);
        $gender = Gender::from($fixture['student_gender']);

        $studentUser = User::firstOrCreate(
            ['email' => $fixture['student_email']],
            [
                'name' => $fixture['student_name'],
                'password' => self::pw(),
                'email_verified_at' => now(),
                'phone' => $this->phone($ctx->campus, 21),
                'job_title' => 'Student',
                'institution_id' => $ctx->institution->id,
                'campus_id' => $ctx->campus->id,
                'is_active' => true,
            ]
        );
        $this->assignRole($ctx, $studentUser, RoleName::Student->value);

        $admissionNo = $fixture['code'].'-2026-0001';
        $student = $this->first(Student::class, [
            'campus_id' => $ctx->campus->id,
            'admission_no' => $admissionNo,
        ], $tenant + [
            'user_id' => $studentUser->id,
            'first_name' => explode(' ', $fixture['student_name'])[0],
            'last_name' => explode(' ', $fixture['student_name'])[1] ?? $fixture['family_name'],
            'gender' => $gender,
            'date_of_birth' => '2016-05-10',
            'blood_group' => 'O+',
            'nationality' => 'Pakistani',
            'religion' => 'Islam',
            'category' => 'General',
            'email' => $studentUser->email,
            'phone' => $studentUser->phone,
            'address' => $fixture['address'],
            'city' => $fixture['city'],
            'admission_date' => $ctx->year->starts_on,
            'status' => StudentStatus::Active,
        ]);

        $ctx->students[] = $student;
        $ctx->studentUsers[$admissionNo] = $studentUser;

        $class = $ctx->classes['C1'];
        $section = $ctx->sections['C1'][0];

        $ctx->enrollments[$student->id] = $this->first(StudentEnrollment::class, [
            'student_id' => $student->id,
            'academic_year_id' => $ctx->year->id,
        ], $tenant + [
            'class_room_id' => $class->id,
            'section_id' => $section->id,
            'roll_number' => '1',
            'status' => EnrollmentStatus::Active,
            'starts_on' => $ctx->year->starts_on,
        ]);

        $this->guardian($ctx, $student, $fixture, GuardianRelation::Father, $fixture['father_email'], 'Father');
        $this->guardian($ctx, $student, $fixture, GuardianRelation::Mother, $fixture['mother_email'], 'Mother');

        return $student;
    }

    /**
     * @param  array<string, string>  $fixture
     */
    protected function guardian(
        UatCampusContext $ctx,
        Student $student,
        array $fixture,
        GuardianRelation $relation,
        string $email,
        string $label
    ): Guardian {
        $tenant = $this->tenant($ctx->campus);

        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name' => $label.' of '.$fixture['student_name'],
                'password' => self::pw(),
                'email_verified_at' => now(),
                'phone' => $this->phone($ctx->campus, $relation === GuardianRelation::Father ? 31 : 32),
                'job_title' => 'Parent / Guardian',
                'institution_id' => $ctx->institution->id,
                'campus_id' => $ctx->campus->id,
                'is_active' => true,
            ]
        );
        $this->assignRole($ctx, $user, RoleName::ParentGuardian->value);

        $guardian = $this->first(Guardian::class, [
            'campus_id' => $ctx->campus->id,
            'user_id' => $user->id,
        ], $tenant + [
            'name' => $label.' of '.$fixture['student_name'],
            'occupation' => $relation === GuardianRelation::Father ? 'Engineer' : 'Teacher',
            'email' => $user->email,
            'phone' => $user->phone,
            'alternate_phone' => $this->phone($ctx->campus, 40),
            'address' => $fixture['address'],
        ]);

        $ctx->guardians[] = $guardian;

        $student->guardians()->syncWithoutDetaching([
            $guardian->id => [
                'relationship' => $relation->value,
                'is_primary' => $relation === GuardianRelation::Father,
                'is_emergency_contact' => $relation === GuardianRelation::Father,
            ],
        ]);

        return $guardian;
    }

    protected function attendance(UatCampusContext $ctx, Student $student): void
    {
        $tenant = $this->tenant($ctx->campus);
        $enrollment = $ctx->enrollments[$student->id];

        $days = [
            ['2026-11-09', AttendanceStatus::Present],
            ['2026-11-10', AttendanceStatus::Late],
        ];

        foreach ($days as [$date, $status]) {
            StudentAttendance::firstOrCreate(
                ['student_id' => $student->id, 'attendance_date' => $date],
                $tenant + [
                    'academic_year_id' => $ctx->year->id,
                    'class_room_id' => $enrollment->class_room_id,
                    'section_id' => $enrollment->section_id,
                    'status' => $status,
                    'marked_by' => $ctx->teachers[0]->id,
                ]
            );
        }
    }

    /**
     * @param  array<string, string>  $fixture
     */
    protected function fees(UatCampusContext $ctx, array $fixture, Student $student): void
    {
        $tenant = $this->tenant($ctx->campus);

        $tuition = $this->first(FeeHead::class, [
            'campus_id' => $ctx->campus->id,
            'code' => 'TUITION',
        ], $tenant + [
            'name' => 'Tuition Fee',
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $admission = $this->first(FeeHead::class, [
            'campus_id' => $ctx->campus->id,
            'code' => 'ADMISSION',
        ], $tenant + [
            'name' => 'Admission Fee',
            'sort_order' => 2,
            'is_active' => true,
        ]);

        foreach ($ctx->classes as $class) {
            $structure = $this->first(FeeStructure::class, [
                'campus_id' => $ctx->campus->id,
                'academic_year_id' => $ctx->year->id,
                'class_room_id' => $class->id,
            ], $tenant + [
                'name' => $class->name.' Fee Structure 2026-2027',
                'is_active' => true,
            ]);

            FeeStructureItem::firstOrCreate(
                ['fee_structure_id' => $structure->id, 'name' => 'Monthly Tuition Fee'],
                [
                    'fee_head_id' => $tuition->id,
                    'billing_kind' => BillingKind::Monthly->value,
                    'amount' => 5000,
                    'is_optional' => false,
                    'sort_order' => 1,
                    'is_active' => true,
                ]
            );

            FeeStructureItem::firstOrCreate(
                ['fee_structure_id' => $structure->id, 'name' => 'Admission Fee'],
                [
                    'fee_head_id' => $admission->id,
                    'billing_kind' => BillingKind::OneTime->value,
                    'amount' => 10000,
                    'is_optional' => false,
                    'sort_order' => 2,
                    'is_active' => true,
                ]
            );
        }

        $counter = app(FeeCounterService::class);
        $userId = $ctx->campusAdmin->id;

        $items = [
            [
                'billing_kind' => BillingKind::Monthly->value,
                'period_year' => 2026,
                'period_month' => 11,
                'title' => 'Monthly Tuition Fee',
                'amount' => 5000,
                'due_date' => '2026-11-15',
                'source' => 'structure',
                'lines' => [
                    ['fee_head_id' => $tuition->id, 'description' => 'Tuition Fee', 'amount' => 5000],
                ],
            ],
            [
                'billing_kind' => BillingKind::OneTime->value,
                'period_year' => 2026,
                'period_month' => 11,
                'title' => 'Admission Fee',
                'amount' => 10000,
                'due_date' => '2026-11-15',
                'source' => 'structure',
                'lines' => [
                    ['fee_head_id' => $admission->id, 'description' => 'Admission Fee', 'amount' => 10000],
                ],
            ],
        ];

        $result = $counter->generate(
            $student,
            ['academic_year_id' => $ctx->year->id],
            $items,
            null,
            $userId
        );

        if ($result['receipt'] === null && ! FeeReceipt::query()->where('student_id', $student->id)->exists()) {
            $counter->receivePayment($student, [
                'academic_year_id' => $ctx->year->id,
                'amount' => 5000,
                'payment_date' => '2026-11-10',
                'method' => 'cash',
                'reference' => 'CASH-'.$fixture['code'].'-001',
                'notes' => 'Partial fee payment recorded by the campus office.',
            ], $userId);
        }

        $this->portalFeeVouchers($ctx, $student);
    }

    /**
     * The parent/student portal reads legacy fee vouchers, so mirror the billing
     * into that ledger to keep the portal fee page functional.
     */
    protected function portalFeeVouchers(UatCampusContext $ctx, Student $student): void
    {
        $tenant = $this->tenant($ctx->campus);

        $plan = $this->first(FeePlan::class, [
            'campus_id' => $ctx->campus->id,
            'academic_year_id' => $ctx->year->id,
            'class_room_id' => $ctx->enrollments[$student->id]->class_room_id,
            'name' => 'Annual Fee Plan',
        ], $tenant + [
            'description' => 'Annual fee plan for primary classes.',
            'is_active' => true,
        ]);

        $vouchers = [
            ['Monthly Tuition Fee', 5000, 5000, 'paid'],
            ['Admission Fee', 10000, 0, 'unpaid'],
        ];

        foreach ($vouchers as $index => [$title, $amount, $paid, $status]) {
            $sequence = $index + 1;

            $voucher = FeeVoucher::firstOrCreate(
                [
                    'student_id' => $student->id,
                    'academic_year_id' => $ctx->year->id,
                    'sequence' => $sequence,
                ],
                $tenant + [
                    'fee_plan_id' => $plan->id,
                    'voucher_no' => 'FV-'.$ctx->campus->code.'-'.sprintf('%05d', $student->id).'-'.$sequence,
                    'due_date' => '2026-11-15',
                    'gross_amount' => $amount,
                    'discount_amount' => 0,
                    'amount' => $amount,
                    'paid_amount' => $paid,
                    'status' => $status,
                    'issued_at' => now(),
                ]
            );

            if ($paid > 0) {
                FeePayment::firstOrCreate(
                    ['campus_id' => $ctx->campus->id, 'receipt_no' => 'RCP-'.$ctx->campus->code.'-'.$student->id.'-'.$sequence],
                    $tenant + [
                        'student_id' => $student->id,
                        'fee_voucher_id' => $voucher->id,
                        'payment_date' => '2026-11-10',
                        'amount' => $paid,
                        'method' => 'cash',
                        'reference' => 'CASH-'.$ctx->campus->code.'-'.$sequence,
                        'status' => 'posted',
                        'created_by' => $ctx->campusAdmin->id,
                    ]
                );
            }
        }
    }

    protected function exams(UatCampusContext $ctx, Student $student): void
    {
        $tenant = $this->tenant($ctx->campus);

        $type = $this->first(ExamType::class, [
            'campus_id' => $ctx->campus->id,
            'code' => 'TERM',
        ], $tenant + [
            'name' => 'Terminal Examination',
            'weightage' => 100,
            'is_active' => true,
        ]);

        $scale = $this->first(GradeScale::class, [
            'campus_id' => $ctx->campus->id,
            'code' => 'PCT',
        ], $tenant + [
            'name' => 'Percentage Grading',
            'is_default' => true,
            'is_active' => true,
        ]);

        $grades = [
            ['A', 80, 100, 4.0],
            ['B', 70, 79.99, 3.0],
            ['C', 60, 69.99, 2.0],
            ['D', 50, 59.99, 1.0],
            ['F', 0, 49.99, 0.0],
        ];
        foreach ($grades as $i => [$grade, $min, $max, $points]) {
            GradeScaleItem::firstOrCreate(
                ['grade_scale_id' => $scale->id, 'grade' => $grade],
                [
                    'sequence' => $i + 1,
                    'min_percentage' => $min,
                    'max_percentage' => $max,
                    'points' => $points,
                    'remark' => $grade === 'F' ? 'Fail' : 'Pass',
                ]
            );
        }

        $completed = $this->first(Exam::class, [
            'campus_id' => $ctx->campus->id,
            'name' => 'First Term Examination 2026',
        ], $tenant + [
            'academic_year_id' => $ctx->year->id,
            'term_id' => $ctx->terms[0]->id,
            'exam_type_id' => $type->id,
            'starts_on' => '2026-12-10',
            'ends_on' => '2026-12-20',
            'status' => ExamStatus::Completed->value,
            'description' => 'First term examination for the 2026-2027 academic year.',
        ]);

        $this->first(Exam::class, [
            'campus_id' => $ctx->campus->id,
            'name' => 'Mid-Term Test 2026',
        ], $tenant + [
            'academic_year_id' => $ctx->year->id,
            'term_id' => $ctx->terms[0]->id,
            'exam_type_id' => $type->id,
            'starts_on' => '2026-11-25',
            'ends_on' => '2026-11-26',
            'status' => ExamStatus::Scheduled->value,
            'description' => 'Mid-term assessment scheduled later in the term.',
        ]);

        $enrollment = $ctx->enrollments[$student->id];
        $marks = ['MATH' => 85, 'COMP' => 92];

        foreach ($ctx->subjects as $code => $subject) {
            $paper = $this->first(ExamPaper::class, [
                'exam_id' => $completed->id,
                'class_room_id' => $enrollment->class_room_id,
                'subject_id' => $subject->id,
            ], $tenant + [
                'exam_date' => '2026-12-12',
                'starts_at' => '09:00:00',
                'ends_at' => '11:00:00',
                'max_marks' => 100,
                'pass_marks' => 40,
            ]);

            ExamMark::firstOrCreate(
                ['exam_paper_id' => $paper->id, 'student_id' => $student->id],
                $tenant + [
                    'exam_id' => $completed->id,
                    'class_room_id' => $enrollment->class_room_id,
                    'subject_id' => $subject->id,
                    'entered_by' => $ctx->teachers[0]->id,
                    'marks_obtained' => $marks[$code],
                    'original_marks_obtained' => $marks[$code],
                    'is_absent' => false,
                ]
            );
        }
    }

    protected function library(UatCampusContext $ctx, Student $student): void
    {
        $tenant = $this->tenant($ctx->campus);

        $titles = [
            ['Mathematics for Primary Classes', 'M. Ashraf', 'Mathematics'],
            ['Introduction to Computers', 'A. Sattar', 'Computers'],
        ];

        $books = [];
        foreach ($titles as $i => [$title, $author, $category]) {
            $books[] = $this->first(Book::class, [
                'campus_id' => $ctx->campus->id,
                'title' => $title,
            ], $tenant + [
                'author' => $author,
                'isbn' => '978-'.sprintf('%010d', abs(crc32($title.$ctx->campus->code))),
                'publisher' => 'National Book Foundation',
                'category' => $category,
                'total_copies' => 5,
                'available_copies' => 4,
                'shelf' => 'S-'.sprintf('%02d', $i + 1),
                'price' => 700 + $i * 100,
                'is_active' => true,
            ]);
        }

        foreach ($books as $i => $book) {
            $returned = $i === 0;

            BookIssue::firstOrCreate(
                ['book_id' => $book->id, 'student_id' => $student->id, 'issued_on' => '2026-10-01'],
                $tenant + [
                    'member_type' => 'student',
                    'due_on' => '2026-10-15',
                    'returned_on' => $returned ? '2026-10-10' : null,
                    'fine_amount' => 0,
                    'status' => ($returned ? BookIssueStatus::Returned : BookIssueStatus::Issued)->value,
                    'issued_by' => $ctx->campusAdmin->id,
                ]
            );
        }
    }

    protected function transport(UatCampusContext $ctx, Student $student): void
    {
        $tenant = $this->tenant($ctx->campus);

        $vehicles = [
            ['Bus 1', 'EDCT-1001', VehicleType::Bus, 50],
            ['Coaster 1', 'EDCT-1002', VehicleType::Coaster, 30],
        ];
        $vehicleModels = [];
        foreach ($vehicles as [$name, $registration, $type, $capacity]) {
            $vehicleModels[] = $this->first(Vehicle::class, [
                'campus_id' => $ctx->campus->id,
                'registration_no' => $registration,
            ], $tenant + [
                'name' => $name,
                'type' => $type->value,
                'capacity' => $capacity,
                'model' => 'Hino',
                'driver_name' => 'Rashid Ali',
                'is_active' => true,
            ]);
        }

        $routes = [
            ['Route A - City Centre', 'RA', 'City Centre', 4500],
            ['Route B - North Suburbs', 'RB', 'North Suburbs', 5500],
        ];

        $routeModels = [];
        foreach ($routes as $i => [$name, $code, $endPoint, $fare]) {
            $route = $this->first(TransportRoute::class, [
                'campus_id' => $ctx->campus->id,
                'code' => $code,
            ], $tenant + [
                'name' => $name,
                'start_point' => 'Main Campus',
                'end_point' => $endPoint,
                'distance_km' => 15.0,
                'fare' => $fare,
                'vehicle_id' => $vehicleModels[$i]->id,
                'is_active' => true,
            ]);
            $routeModels[] = $route;

            TransportRouteStop::firstOrCreate(
                ['transport_route_id' => $route->id, 'sequence' => 1],
                $tenant + [
                    'name' => $endPoint.' Stop 1',
                    'pickup_time' => '06:45:00',
                    'drop_time' => '14:45:00',
                    'fare' => $fare,
                ]
            );
        }

        $route = $routeModels[0];
        $stop = TransportRouteStop::query()
            ->where('transport_route_id', $route->id)
            ->orderBy('sequence')
            ->first();

        TransportAllocation::firstOrCreate(
            ['student_id' => $student->id, 'start_date' => '2026-04-01'],
            $tenant + [
                'transport_route_id' => $route->id,
                'transport_route_stop_id' => $stop?->id,
                'vehicle_id' => $route->vehicle_id,
                'direction' => 'both',
                'fare' => $route->fare,
                'status' => 'active',
            ]
        );
    }

    protected function conduct(UatCampusContext $ctx, Student $student): void
    {
        $tenant = $this->tenant($ctx->campus);

        $records = [
            [
                'Achievement at inter-house quiz',
                ConductCategory::Achievement,
                ConductSeverity::Low,
                ConductStatus::Resolved,
                '2026-10-20',
                'Awarded a certificate at the inter-house quiz competition.',
            ],
            [
                'Late arrival during assembly',
                ConductCategory::Discipline,
                ConductSeverity::Low,
                ConductStatus::Resolved,
                '2026-11-05',
                'Counselled by the class teacher.',
            ],
        ];

        foreach ($records as [$title, $category, $severity, $status, $occurredOn, $action]) {
            $this->first(ConductRecord::class, [
                'campus_id' => $ctx->campus->id,
                'student_id' => $student->id,
                'title' => $title,
            ], $tenant + [
                'academic_year_id' => $ctx->year->id,
                'category' => $category,
                'severity' => $severity,
                'description' => $title.' recorded by the class teacher.',
                'action_taken' => $action,
                'occurred_on' => $occurredOn,
                'status' => $status,
                'reported_by' => $ctx->teachers[0]->id,
                'resolved_by' => $status === ConductStatus::Resolved ? $ctx->campusAdmin->id : null,
                'resolved_at' => $status === ConductStatus::Resolved ? Carbon::parse($occurredOn)->addDays(1) : null,
                'resolution_note' => $status === ConductStatus::Resolved ? $action : null,
                'created_by' => $ctx->campusAdmin->id,
            ]);
        }
    }

    protected function circulars(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);

        $circulars = [
            [
                'Welcome to the 2026-2027 Academic Year',
                CircularAudience::All,
                CircularStatus::Published,
                '2026-11-01',
            ],
            [
                'First Term Examination Schedule',
                CircularAudience::Parents,
                CircularStatus::Published,
                '2026-11-08',
            ],
        ];

        foreach ($circulars as [$title, $audience, $status, $publishedOn]) {
            $this->first(Circular::class, [
                'campus_id' => $ctx->campus->id,
                'title' => $title,
            ], $tenant + [
                'body' => "Dear all,\n\n".$title.". Please read the details carefully and contact the campus office for questions.\n\nRegistrar's Office",
                'audience' => $audience,
                'status' => $status,
                'published_at' => $publishedOn.' 09:00:00',
                'created_by' => $ctx->campusAdmin->id,
            ]);
        }
    }
}
