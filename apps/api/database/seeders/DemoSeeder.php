<?php

namespace Database\Seeders;

use App\Enums\AcademicEventType;
use App\Enums\BankAccountType;
use App\Enums\BudgetPeriodType;
use App\Enums\BudgetStatus;
use App\Enums\CampusType;
use App\Enums\EnrollmentStatus;
use App\Enums\ExpenseStatus;
use App\Enums\Gender;
use App\Enums\JournalStatus;
use App\Enums\PaymentMethod;
use App\Enums\ReconciliationStatus;
use App\Enums\RoleName;
use App\Enums\StudentStatus;
use App\Enums\SubjectType;
use App\Models\AcademicEvent;
use App\Models\AcademicYear;
use App\Models\BankAccount;
use App\Models\BankReconciliation;
use App\Models\Budget;
use App\Models\Campus;
use App\Models\ChartOfAccount;
use App\Models\ClassRoom;
use App\Models\ClassSubject;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\ExpensePayment;
use App\Models\FeeHead;
use App\Models\FeePayment;
use App\Models\FeePlan;
use App\Models\FeeVoucher;
use App\Models\FiscalYear;
use App\Models\Guardian;
use App\Models\Institution;
use App\Models\JournalEntry;
use App\Models\Period;
use App\Models\Room;
use App\Models\Section;
use App\Models\Stage;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\Subject;
use App\Models\TeachingAssignment;
use App\Models\Term;
use App\Models\TimetableSlot;
use App\Models\User;
use App\Models\Vendor;
use App\Services\Accounting\BankReconciliationService;
use App\Services\Accounting\DefaultChartOfAccounts;
use App\Services\Accounting\ExpenseService;
use App\Services\Accounting\FeeBillingService;
use App\Services\Accounting\JournalService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;

class DemoSeeder extends Seeder
{
    public function __construct(
        private readonly DefaultChartOfAccounts $chart,
        private readonly JournalService $journals,
        private readonly FeeBillingService $billing,
        private readonly ExpenseService $expenses,
        private readonly BankReconciliationService $bankBook,
    ) {}

    public function run(): void
    {
        $institution = Institution::firstOrCreate(
            ['code' => 'DEMO-TRUST'],
            [
                'name' => 'Demo Education Trust',
                'legal_name' => 'Demo Education Trust (Registered)',
                'email' => 'info@demo-eis.test',
                'phone' => '+92-000-0000000',
                'website' => 'https://demo-eis.test',
                'plan' => 'standard',
                'status' => 'active',
                'is_active' => true,
            ]
        );

        $campus = Campus::firstOrCreate(
            ['institution_id' => $institution->id, 'code' => 'MAIN'],
            [
                'name' => 'Main Campus',
                'type' => CampusType::School,
                'academic_model' => 'school',
                'term_system' => 'terms',
                'grading_system' => 'percentage',
                'credit_hours_enabled' => false,
                'email' => 'main@demo-eis.test',
                'is_active' => true,
            ]
        );

        $platformAdmin = User::firstOrCreate(
            ['email' => 'superadmin@demo-eis.test'],
            [
                'name' => 'Platform Admin',
                'password' => 'password',
                'job_title' => 'SaaS Platform Administrator',
                'is_active' => true,
            ]
        );
        $platformAdmin->syncRoles([RoleName::PlatformAdmin->value]);

        $campusAdmin = User::firstOrCreate(
            ['email' => 'campusadmin@demo-eis.test'],
            [
                'name' => 'Campus Admin',
                'password' => 'password',
                'institution_id' => $institution->id,
                'campus_id' => $campus->id,
                'job_title' => 'Campus Administrator',
                'is_active' => true,
            ]
        );
        $campusAdmin->syncRoles([RoleName::CampusAdmin->value]);

        $campusAdmin->scopeAssignments()->firstOrCreate(
            [
                'role' => RoleName::CampusAdmin->value,
                'campus_id' => $campus->id,
            ],
            [
                'institution_id' => $institution->id,
                'scope_type' => 'campus',
                'scope_id' => $campus->id,
                'granted_by' => $platformAdmin->id,
                'is_active' => true,
            ]
        );

        $teacher = User::firstOrCreate(
            ['email' => 'teacher@demo-eis.test'],
            [
                'name' => 'Demo Teacher',
                'password' => 'password',
                'institution_id' => $institution->id,
                'campus_id' => $campus->id,
                'job_title' => 'Mathematics Teacher',
                'is_active' => true,
            ]
        );
        $teacher->syncRoles([RoleName::Teacher->value]);

        $this->seedAcademics($institution, $campus, $teacher);
        $this->seedFinance($institution, $campus, $campusAdmin);
        $this->seedStudents($institution, $campus);
        $this->seedFeeBilling($campus, $campusAdmin);
        $this->seedBudget($institution, $campus, $campusAdmin);
        $this->seedExpenses($institution, $campus, $campusAdmin);
        $this->seedBankAccounts($institution, $campus, $campusAdmin);

        $this->command?->info('Demo users (password: password):');
        $this->command?->info('  superadmin@demo-eis.test  Super User / product owner (all institutions)');
        $this->command?->info('  campusadmin@demo-eis.test Campus admin (Main Campus)');
        $this->command?->info('  teacher@demo-eis.test     Teacher (Main Campus)');
    }

    private function seedAcademics(Institution $institution, Campus $campus, User $teacher): void
    {
        $tenant = ['institution_id' => $institution->id, 'campus_id' => $campus->id];

        $year = AcademicYear::firstOrCreate(
            ['campus_id' => $campus->id, 'name' => '2026-2027'],
            $tenant + [
                'code' => 'AY-2026',
                'starts_on' => '2026-04-01',
                'ends_on' => '2027-03-31',
                'status' => 'active',
                'is_current' => true,
            ]
        );

        foreach ([
            ['Term 1', 1, '2026-04-01', '2026-08-31'],
            ['Term 2', 2, '2026-09-01', '2026-12-31'],
            ['Term 3', 3, '2027-01-01', '2027-03-31'],
        ] as $index => [$name, $sequence, $from, $to]) {
            Term::firstOrCreate(
                ['academic_year_id' => $year->id, 'name' => $name],
                $tenant + [
                    'sequence' => $sequence,
                    'starts_on' => $from,
                    'ends_on' => $to,
                    'is_current' => $index === 0,
                ]
            );
        }

        $stages = [
            ['Early Years', 'EY', 1],
            ['Primary', 'PRI', 2],
            ['Middle', 'MID', 3],
        ];

        $stageModels = [];
        foreach ($stages as [$name, $code, $sequence]) {
            $stageModels[$code] = Stage::firstOrCreate(
                ['campus_id' => $campus->id, 'code' => $code],
                $tenant + ['name' => $name, 'sequence' => $sequence, 'is_active' => true]
            );
        }

        $classes = [
            ['Playgroup', 'PG', $stageModels['EY']->id, 1],
            ['Nursery', 'NUR', $stageModels['EY']->id, 2],
            ['Class 1', 'C1', $stageModels['PRI']->id, 3],
            ['Class 2', 'C2', $stageModels['PRI']->id, 4],
        ];

        $classModels = [];
        foreach ($classes as [$name, $code, $stageId, $sequence]) {
            $classModels[$code] = ClassRoom::firstOrCreate(
                ['campus_id' => $campus->id, 'code' => $code],
                $tenant + [
                    'stage_id' => $stageId,
                    'name' => $name,
                    'sequence' => $sequence,
                    'capacity' => 40,
                    'is_active' => true,
                ]
            );
        }

        $sectionA = Section::firstOrCreate(
            ['class_room_id' => $classModels['C1']->id, 'name' => 'A'],
            $tenant + ['capacity' => 35, 'is_active' => true]
        );

        Section::firstOrCreate(
            ['class_room_id' => $classModels['C1']->id, 'name' => 'B'],
            $tenant + ['capacity' => 35, 'is_active' => true]
        );

        $subjects = [
            ['English', 'ENG', SubjectType::Core, false],
            ['Mathematics', 'MATH', SubjectType::Core, false],
            ['Science', 'SCI', SubjectType::Core, false],
            ['Social Studies', 'SST', SubjectType::Core, false],
            ['Islamiat', 'ISL', SubjectType::Core, false],
            ['Art', 'ART', SubjectType::Elective, true],
        ];

        $subjectModels = [];
        foreach ($subjects as [$name, $code, $type, $elective]) {
            $subjectModels[$code] = Subject::firstOrCreate(
                ['campus_id' => $campus->id, 'code' => $code],
                $tenant + [
                    'name' => $name,
                    'type' => $type,
                    'weekly_periods' => 5,
                    'is_active' => true,
                ]
            );

            ClassSubject::firstOrCreate(
                [
                    'academic_year_id' => $year->id,
                    'class_room_id' => $classModels['C1']->id,
                    'subject_id' => $subjectModels[$code]->id,
                ],
                $tenant + ['is_elective' => $elective, 'weekly_periods' => 5, 'is_active' => true]
            );
        }

        TeachingAssignment::firstOrCreate(
            [
                'academic_year_id' => $year->id,
                'teacher_user_id' => $teacher->id,
                'subject_id' => $subjectModels['MATH']->id,
                'class_room_id' => $classModels['C1']->id,
                'section_id' => $sectionA->id,
            ],
            $tenant + ['weekly_periods' => 5, 'is_active' => true]
        );

        $events = [
            ['Summer Holidays', AcademicEventType::Holiday, '2026-06-01', '2026-07-15'],
            ['Mid-Term Examinations', AcademicEventType::Exam, '2026-09-15', '2026-09-25'],
            ['Annual Sports Day', AcademicEventType::Event, '2026-11-20', null],
        ];

        foreach ($events as [$title, $type, $startsOn, $endsOn]) {
            AcademicEvent::firstOrCreate(
                ['campus_id' => $campus->id, 'title' => $title, 'starts_on' => $startsOn],
                $tenant + [
                    'academic_year_id' => $year->id,
                    'type' => $type,
                    'ends_on' => $endsOn,
                    'is_all_day' => true,
                    'created_by' => $teacher->id,
                ]
            );
        }

        $this->seedTimetable($tenant, $year, $classModels['C1'], $sectionA, $subjectModels, $teacher);
    }

    /**
     * @param  array<string, mixed>  $tenant
     * @param  array<string, Subject>  $subjectModels
     */
    private function seedTimetable(
        array $tenant,
        AcademicYear $year,
        ClassRoom $class,
        Section $section,
        array $subjectModels,
        User $teacher,
    ): void {
        $periods = [
            ['Assembly', 1, '07:50', '08:10', true],
            ['Period 1', 2, '08:10', '08:55', false],
            ['Period 2', 3, '08:55', '09:40', false],
            ['Recess', 4, '09:40', '10:00', true],
            ['Period 3', 5, '10:00', '10:45', false],
            ['Period 4', 6, '10:45', '11:30', false],
        ];

        $periodModels = [];
        foreach ($periods as [$name, $sequence, $startsAt, $endsAt, $isBreak]) {
            $periodModels[$sequence] = Period::firstOrCreate(
                ['campus_id' => $class->campus_id, 'sequence' => $sequence],
                $tenant + [
                    'name' => $name,
                    'starts_at' => $startsAt,
                    'ends_at' => $endsAt,
                    'is_break' => $isBreak,
                    'is_active' => true,
                ]
            );
        }

        $rooms = [
            ['Room 101', 'R101', 'Block A', 'Ground', 'classroom', 40],
            ['Room 102', 'R102', 'Block A', 'Ground', 'classroom', 40],
            ['Science Lab', 'LAB1', 'Block B', 'First', 'lab', 30],
        ];

        $roomModels = [];
        foreach ($rooms as [$name, $code, $block, $floor, $type, $capacity]) {
            $roomModels[$code] = Room::firstOrCreate(
                ['campus_id' => $class->campus_id, 'code' => $code],
                $tenant + [
                    'name' => $name,
                    'block' => $block,
                    'floor' => $floor,
                    'type' => $type,
                    'capacity' => $capacity,
                    'is_active' => true,
                ]
            );
        }

        $timetable = [
            [1, 2, 'MATH', true],
            [1, 3, 'ENG', false],
            [2, 2, 'SCI', false],
            [2, 3, 'MATH', true],
            [3, 2, 'SST', false],
            [3, 3, 'MATH', true],
        ];

        foreach ($timetable as [$day, $periodSequence, $subjectCode, $withTeacher]) {
            TimetableSlot::firstOrCreate(
                [
                    'academic_year_id' => $year->id,
                    'class_room_id' => $class->id,
                    'section_id' => $section->id,
                    'day_of_week' => $day,
                    'period_id' => $periodModels[$periodSequence]->id,
                ],
                $tenant + [
                    'subject_id' => $subjectModels[$subjectCode]->id,
                    'teacher_user_id' => $withTeacher ? $teacher->id : null,
                    'room_id' => $roomModels['R101']->id,
                    'is_published' => true,
                ]
            );
        }
    }

    private function seedFinance(Institution $institution, Campus $campus, User $campusAdmin): void
    {
        $tenant = ['institution_id' => $institution->id, 'campus_id' => $campus->id];

        $fiscalYear = FiscalYear::firstOrCreate(
            ['campus_id' => $campus->id, 'code' => 'FY-2026-27'],
            $tenant + [
                'name' => '2026-2027',
                'starts_on' => '2026-07-01',
                'ends_on' => '2027-06-30',
                'status' => 'open',
                'is_current' => true,
            ]
        );

        $accounts = $this->chart->seed($campus);

        $this->seedJournalEntry(
            $tenant,
            $fiscalYear,
            'JV/ADM/0001',
            '2026-07-05',
            'Admission fee received in cash',
            [
                [$accounts->get('1010'), 50000, 0, 'Cash received'],
                [$accounts->get('4020'), 0, 50000, 'Admission fee income'],
            ],
            $campusAdmin,
        );

        $this->seedJournalEntry(
            $tenant,
            $fiscalYear,
            'JV/SAL/0002',
            '2026-07-31',
            'July staff salaries paid from bank',
            [
                [$accounts->get('5010'), 120000, 0, 'Salaries and wages'],
                [$accounts->get('1020'), 0, 120000, 'Bank transfer'],
            ],
            $campusAdmin,
        );

        $this->seedFees($tenant, $campus, $accounts);
    }

    /**
     * @param  array<string, mixed>  $tenant
     * @param  Collection<string, ChartOfAccount>  $accounts
     */
    private function seedFees(array $tenant, Campus $campus, Collection $accounts): void
    {
        $year = AcademicYear::query()
            ->where('campus_id', $campus->id)
            ->where('is_current', true)
            ->first();

        $class = ClassRoom::query()
            ->where('campus_id', $campus->id)
            ->where('code', 'C1')
            ->first();

        if ($year === null || $class === null) {
            return;
        }

        $heads = [
            ['TUI', 'Tuition Fee', '4010', 10, false],
            ['ADM', 'Admission Fee', '4020', 20, false],
            ['TRA', 'Transport Fee', '4030', 30, true],
            ['MSC', 'Miscellaneous Charges', '4040', 40, false],
        ];

        $headModels = [];
        foreach ($heads as [$code, $name, $accountCode, $sort, $optional]) {
            $headModels[$code] = FeeHead::firstOrCreate(
                ['campus_id' => $campus->id, 'code' => $code],
                $tenant + [
                    'name' => $name,
                    'income_account_id' => $accounts->get($accountCode)?->id,
                    'sort_order' => $sort,
                    'is_active' => true,
                ]
            );
        }

        $plan = FeePlan::firstOrCreate(
            [
                'campus_id' => $campus->id,
                'academic_year_id' => $year->id,
                'class_room_id' => $class->id,
                'name' => 'Class 1 Standard Fee 2026-2027',
            ],
            $tenant + [
                'description' => 'Standard monthly and annual charges for Class 1.',
                'is_active' => true,
                'late_fee_type' => 'flat',
                'late_fee_amount' => 500,
                'late_fee_grace_days' => 7,
            ]
        );

        $items = [
            ['TUI', 30000, false],
            ['ADM', 5000, false],
            ['MSC', 2000, false],
            ['TRA', 4000, true],
        ];

        foreach ($items as $index => [$code, $amount, $optional]) {
            $plan->items()->firstOrCreate(
                ['fee_head_id' => $headModels[$code]->id],
                ['amount' => $amount, 'is_optional' => $optional, 'sort_order' => $index]
            );
        }

        foreach ([
            ['First Installment', '2026-07-10', 40],
            ['Second Installment', '2026-10-10', 30],
            ['Third Installment', '2027-01-10', 30],
        ] as $index => [$label, $dueDate, $percentage]) {
            $plan->installments()->firstOrCreate(
                ['sequence' => $index + 1],
                ['label' => $label, 'due_date' => $dueDate, 'percentage' => $percentage]
            );
        }
    }

    private function seedFeeBilling(Campus $campus, User $campusAdmin): void
    {
        $year = AcademicYear::query()
            ->where('campus_id', $campus->id)
            ->where('is_current', true)
            ->first();

        $class = ClassRoom::query()
            ->where('campus_id', $campus->id)
            ->where('code', 'C1')
            ->first();

        if ($year === null || $class === null) {
            return;
        }

        $plan = FeePlan::query()
            ->where('campus_id', $campus->id)
            ->where('academic_year_id', $year->id)
            ->where('class_room_id', $class->id)
            ->first();

        if ($plan === null) {
            return;
        }

        $scholarship = Student::query()
            ->where('campus_id', $campus->id)
            ->where('admission_no', 'ADM-00002')
            ->first();

        $discounts = $scholarship !== null ? [$scholarship->id => 3000] : [];

        $this->billing->generateForClass($plan, $discounts, $campusAdmin->id);

        $voucher = FeeVoucher::query()
            ->where('campus_id', $campus->id)
            ->where('fee_plan_id', $plan->id)
            ->where('sequence', 1)
            ->orderBy('student_id')
            ->with('student')
            ->first();

        if ($voucher === null || $voucher->student === null) {
            return;
        }

        $alreadyPaid = FeePayment::query()
            ->where('campus_id', $campus->id)
            ->where('fee_voucher_id', $voucher->id)
            ->exists();

        if ($alreadyPaid) {
            return;
        }

        $payment = FeePayment::create([
            'institution_id' => $voucher->institution_id,
            'campus_id' => $voucher->campus_id,
            'student_id' => $voucher->student_id,
            'fee_voucher_id' => $voucher->id,
            'receipt_no' => $this->billing->nextReceiptNo($campus->id),
            'payment_date' => '2026-07-12',
            'amount' => $voucher->amount,
            'method' => PaymentMethod::Cash,
            'notes' => 'First installment received at the counter.',
            'created_by' => $campusAdmin->id,
        ]);

        $this->billing->recordPayment($payment, $campusAdmin->id);
    }

    private function seedBudget(Institution $institution, Campus $campus, User $campusAdmin): void
    {
        $tenant = ['institution_id' => $institution->id, 'campus_id' => $campus->id];

        $fiscalYear = FiscalYear::query()
            ->where('campus_id', $campus->id)
            ->where('code', 'FY-2026-27')
            ->first();

        if ($fiscalYear === null) {
            return;
        }

        $accounts = $this->chart->seed($campus);

        $budget = Budget::firstOrCreate(
            [
                'campus_id' => $campus->id,
                'fiscal_year_id' => $fiscalYear->id,
                'name' => 'Annual Operating Budget 2026-2027',
            ],
            $tenant + [
                'period_type' => BudgetPeriodType::Annual,
                'starts_on' => '2026-07-01',
                'ends_on' => '2027-06-30',
                'status' => BudgetStatus::Approved,
                'notes' => 'Board-approved operating budget for the demo campus.',
                'created_by' => $campusAdmin->id,
                'approved_by' => $campusAdmin->id,
                'approved_at' => now(),
            ]
        );

        if ($budget->lines()->exists()) {
            return;
        }

        foreach ([
            ['5010', 2400000],
            ['5020', 360000],
            ['5030', 300000],
            ['5040', 180000],
            ['5050', 120000],
        ] as [$code, $amount]) {
            $account = $accounts->get($code);

            if ($account === null) {
                continue;
            }

            $budget->lines()->create($tenant + [
                'chart_of_account_id' => $account->id,
                'amount' => $amount,
            ]);
        }
    }

    private function seedExpenses(Institution $institution, Campus $campus, User $campusAdmin): void
    {
        if (Expense::query()->where('campus_id', $campus->id)->exists()) {
            return;
        }

        $tenant = ['institution_id' => $institution->id, 'campus_id' => $campus->id];
        $accounts = $this->chart->seed($campus);

        $categoryDefs = [
            ['SAL', 'Salaries and Wages', '5010', 10],
            ['UTL', 'Utilities', '5020', 20],
            ['SUP', 'Teaching Supplies', '5030', 30],
            ['REP', 'Repairs and Maintenance', '5040', 40],
            ['MKT', 'Marketing and Promotion', '5050', 50],
        ];

        $categories = [];

        foreach ($categoryDefs as [$code, $name, $accountCode, $sort]) {
            $categories[$code] = ExpenseCategory::firstOrCreate(
                ['campus_id' => $campus->id, 'code' => $code],
                $tenant + [
                    'name' => $name,
                    'expense_account_id' => $accounts->get($accountCode)?->id,
                    'sort_order' => $sort,
                    'is_active' => true,
                ]
            );
        }

        $vendorDefs = [
            ['VND-PWR', 'Pakistan Power Co', '0300-1111111'],
            ['VND-STA', 'Stationery Mart', '0300-2222222'],
            ['VND-FIX', 'BuildFix Services', '0300-3333333'],
        ];

        $vendors = [];

        foreach ($vendorDefs as [$code, $name, $phone]) {
            $vendors[$code] = Vendor::firstOrCreate(
                ['campus_id' => $campus->id, 'code' => $code],
                $tenant + [
                    'name' => $name,
                    'phone' => $phone,
                    'payable_account_id' => $accounts->get('2010')?->id,
                    'is_active' => true,
                ]
            );
        }

        $bills = [
            ['2026-08-05', 'VND-STA', 'INV-1001', 'SUP', 45000, ['2026-08-10', 45000, PaymentMethod::BankTransfer]],
            ['2026-08-15', 'VND-PWR', 'ELEC-07', 'UTL', 30000, ['2026-08-20', 10000, PaymentMethod::Cash]],
            ['2026-09-01', 'VND-FIX', 'RF-2201', 'REP', 20000, null],
        ];

        foreach ($bills as [$date, $vendorCode, $billNo, $categoryCode, $amount, $settlement]) {
            $expense = Expense::create($tenant + [
                'fiscal_year_id' => $this->expenses->fiscalYearFor($date)->id,
                'vendor_id' => $vendors[$vendorCode]->id,
                'reference' => $this->expenses->nextReference($campus->id),
                'expense_date' => $date,
                'status' => ExpenseStatus::Draft,
                'bill_no' => $billNo,
                'memo' => 'Seeded vendor bill.',
                'total' => 0,
                'paid_amount' => 0,
                'created_by' => $campusAdmin->id,
            ]);

            $expense->lines()->create([
                'expense_category_id' => $categories[$categoryCode]->id,
                'amount' => $amount,
                'description' => $categories[$categoryCode]->name,
            ]);

            $this->expenses->approve($expense, $campusAdmin->id);

            if ($settlement === null) {
                continue;
            }

            [$paymentDate, $paidAmount, $method] = $settlement;

            $payment = ExpensePayment::create($tenant + [
                'expense_id' => $expense->id,
                'reference' => $this->expenses->nextPaymentReference($campus->id),
                'payment_date' => $paymentDate,
                'amount' => $paidAmount,
                'method' => $method,
                'created_by' => $campusAdmin->id,
            ]);

            $this->expenses->recordPayment($payment, $campusAdmin->id);
        }
    }

    private function seedBankAccounts(Institution $institution, Campus $campus, User $campusAdmin): void
    {
        if (BankAccount::query()->where('campus_id', $campus->id)->exists()) {
            return;
        }

        $tenant = ['institution_id' => $institution->id, 'campus_id' => $campus->id];
        $accounts = $this->chart->seed($campus);

        $bank = BankAccount::create($tenant + [
            'chart_of_account_id' => $accounts->get('1020')->id,
            'code' => 'BA-MAIN',
            'name' => 'Main College Bank Account',
            'type' => BankAccountType::Bank,
            'account_no' => 'PK36-DEMO-0001',
            'bank_name' => 'Demo Bank',
            'branch' => 'Main Branch',
            'currency' => 'PKR',
            'opening_balance' => 0,
            'is_active' => true,
        ]);

        BankAccount::create($tenant + [
            'chart_of_account_id' => $accounts->get('1010')->id,
            'code' => 'PC-MAIN',
            'name' => 'Petty Cash',
            'type' => BankAccountType::PettyCash,
            'currency' => 'PKR',
            'opening_balance' => 0,
            'is_active' => true,
        ]);

        $asOf = '2026-09-30';
        $book = $this->bankBook->bookBalance($bank, $asOf);

        BankReconciliation::create($tenant + [
            'bank_account_id' => $bank->id,
            'statement_date' => $asOf,
            'opening_balance' => $book['opening_balance'],
            'book_balance' => $book['closing_balance'],
            'statement_closing_balance' => $book['closing_balance'],
            'difference' => 0,
            'status' => ReconciliationStatus::Completed,
            'notes' => 'Seeded reconciliation matching the book balance.',
            'reconciled_by' => $campusAdmin->id,
            'reconciled_at' => now(),
        ]);
    }

    private function seedStudents(Institution $institution, Campus $campus): void
    {
        $tenant = ['institution_id' => $institution->id, 'campus_id' => $campus->id];

        $year = AcademicYear::query()->where('campus_id', $campus->id)->where('is_current', true)->first();
        $class = ClassRoom::query()->where('campus_id', $campus->id)->where('code', 'C1')->first();

        if ($year === null || $class === null) {
            return;
        }

        $section = Section::query()->where('class_room_id', $class->id)->where('name', 'A')->first();

        $roster = [
            [
                'admission_no' => 'ADM-00001',
                'first_name' => 'Ali',
                'last_name' => 'Raza',
                'gender' => Gender::Male,
                'roll_number' => '1',
                'guardian' => ['name' => 'Imran Raza', 'phone' => '+92-300-0000001', 'occupation' => 'Engineer'],
                'relationship' => 'father',
            ],
            [
                'admission_no' => 'ADM-00002',
                'first_name' => 'Sara',
                'last_name' => 'Khan',
                'gender' => Gender::Female,
                'roll_number' => '2',
                'guardian' => ['name' => 'Bilal Khan', 'phone' => '+92-300-0000002', 'occupation' => 'Doctor'],
                'relationship' => 'father',
            ],
        ];

        foreach ($roster as $entry) {
            $student = Student::firstOrCreate(
                ['campus_id' => $campus->id, 'admission_no' => $entry['admission_no']],
                $tenant + [
                    'first_name' => $entry['first_name'],
                    'last_name' => $entry['last_name'],
                    'gender' => $entry['gender'],
                    'admission_date' => '2026-04-01',
                    'status' => StudentStatus::Active,
                ]
            );

            $guardian = Guardian::firstOrCreate(
                ['campus_id' => $campus->id, 'phone' => $entry['guardian']['phone']],
                $tenant + [
                    'name' => $entry['guardian']['name'],
                    'occupation' => $entry['guardian']['occupation'],
                ]
            );

            $student->guardians()->syncWithoutDetaching([
                $guardian->id => [
                    'relationship' => $entry['relationship'],
                    'is_primary' => true,
                    'is_emergency_contact' => true,
                ],
            ]);

            StudentEnrollment::firstOrCreate(
                ['student_id' => $student->id, 'academic_year_id' => $year->id],
                $tenant + [
                    'class_room_id' => $class->id,
                    'section_id' => $section?->id,
                    'roll_number' => $entry['roll_number'],
                    'status' => EnrollmentStatus::Active,
                    'starts_on' => '2026-04-01',
                ]
            );
        }
    }

    /**
     * @param  array<string, mixed>  $tenant
     * @param  array<int, array{0: ChartOfAccount, 1: float|int, 2: float|int, 3: string}>  $lines
     */
    private function seedJournalEntry(
        array $tenant,
        FiscalYear $fiscalYear,
        string $reference,
        string $entryDate,
        string $memo,
        array $lines,
        User $author,
    ): void {
        if (JournalEntry::query()->where('campus_id', $fiscalYear->campus_id)->where('reference', $reference)->exists()) {
            return;
        }

        $entry = JournalEntry::create($tenant + [
            'fiscal_year_id' => $fiscalYear->id,
            'reference' => $reference,
            'entry_date' => $entryDate,
            'status' => JournalStatus::Draft,
            'memo' => $memo,
        ]);

        foreach ($lines as $index => [$account, $debit, $credit, $description]) {
            $entry->lines()->create([
                'chart_of_account_id' => $account->id,
                'line_no' => $index + 1,
                'description' => $description,
                'debit' => $debit,
                'credit' => $credit,
            ]);
        }

        $this->journals->post($entry, $author->id);
    }
}
