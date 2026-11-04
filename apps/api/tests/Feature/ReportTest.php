<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Enums\ScholarshipAwardStatus;
use App\Enums\ScholarshipDiscountType;
use App\Enums\ScholarshipType;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ChartOfAccount;
use App\Models\ClassRoom;
use App\Models\Exam;
use App\Models\ExamMark;
use App\Models\ExamPaper;
use App\Models\ExamType;
use App\Models\FeePayment;
use App\Models\FeePlan;
use App\Models\FeeVoucher;
use App\Models\FiscalYear;
use App\Models\IncomeSource;
use App\Models\Institution;
use App\Models\JournalEntry;
use App\Models\OtherIncome;
use App\Models\PayrollRun;
use App\Models\Scholarship;
use App\Models\ScholarshipAward;
use App\Models\Section;
use App\Models\StaffMember;
use App\Models\Stage;
use App\Models\Student;
use App\Models\StudentAttendance;
use App\Models\StudentEnrollment;
use App\Models\Subject;
use App\Models\TeachingAssignment;
use App\Models\User;
use App\Services\Accounting\DefaultChartOfAccounts;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private User $teacher;

    private AcademicYear $year;

    private ClassRoom $class;

    private Exam $exam;

    private Student $ali;

    private Student $sara;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->institution = Institution::create(['name' => 'Test Trust', 'code' => 'TT']);
        $this->campus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus A', 'code' => 'A', 'type' => CampusType::School->value,
        ]);

        $this->admin = $this->actor(RoleName::CampusAdmin);
        $this->teacher = $this->actor(RoleName::Teacher);

        $this->year = AcademicYear::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => '2026-2027', 'code' => 'AY',
            'starts_on' => '2026-04-01', 'ends_on' => '2027-03-31', 'status' => 'active',
        ]);

        $stage = Stage::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Primary', 'code' => 'PRI', 'sequence' => 1,
        ]);

        $this->class = ClassRoom::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'stage_id' => $stage->id, 'name' => 'Class 1', 'code' => 'C1',
        ]);

        $section = Section::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'class_room_id' => $this->class->id, 'name' => 'A',
        ]);

        $subject = Subject::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Mathematics', 'code' => 'MATH', 'type' => 'core',
        ]);

        $examType = ExamType::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Mid Term', 'code' => 'MID', 'weightage' => 40,
        ]);

        $this->exam = Exam::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'academic_year_id' => $this->year->id,
            'exam_type_id' => $examType->id,
            'name' => 'Mid Term 2026',
            'starts_on' => '2026-09-01', 'ends_on' => '2026-09-10',
            'status' => 'scheduled',
        ]);

        $this->ali = $this->student('ADM-1', 'Ali', 'Raza', $section);
        $this->sara = $this->student('ADM-2', 'Sara', 'Khan', $section);

        ExamPaper::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'exam_id' => $this->exam->id,
            'class_room_id' => $this->class->id,
            'subject_id' => $subject->id,
            'exam_date' => '2026-09-02',
            'max_marks' => 100, 'pass_marks' => 40,
        ]);
    }

    public function test_campus_dashboard_and_progress_reports(): void
    {
        $this->attendance($this->ali, '2026-09-02', 'present');
        $this->attendance($this->ali, '2026-09-03', 'absent');

        $staff = StaffMember::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'employee_no' => 'EMP-0001', 'first_name' => 'Ayesha', 'last_name' => 'Malik',
            'employment_type' => 'permanent', 'status' => 'active', 'joining_date' => '2026-01-01',
        ]);
        $this->assertNotNull($staff->id);

        $dashboard = $this->api($this->admin)
            ->getJson('/api/v1/reports/campus-dashboard')
            ->assertOk()
            ->json('data');

        $this->assertSame(2, $dashboard['students_active']);
        $this->assertSame(2, $dashboard['enrollments_active']);
        $this->assertSame(1, $dashboard['staff_employed']);
        $this->assertCount(6, $dashboard['collections_by_month']);
        $this->assertSame(
            now()->format('Y-m'),
            $dashboard['collections_by_month'][5]['month']
        );
        $this->assertIsArray($dashboard['vouchers_by_status']);
        $this->assertIsArray($dashboard['admissions_by_status']);

        $scholarship = Scholarship::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Merit Award',
            'code' => 'MERIT',
            'type' => ScholarshipType::Merit,
            'discount_type' => ScholarshipDiscountType::Percentage,
            'value' => 10,
            'academic_year_id' => $this->year->id,
            'is_active' => true,
        ]);

        ScholarshipAward::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'scholarship_id' => $scholarship->id,
            'student_id' => $this->ali->id,
            'academic_year_id' => $this->year->id,
            'awarded_on' => '2026-09-01',
            'starts_on' => '2026-04-01',
            'ends_on' => '2027-03-31',
            'status' => ScholarshipAwardStatus::Active,
        ]);

        $progress = $this->api($this->admin)
            ->getJson('/api/v1/reports/progress?academic_year_id='.$this->year->id)
            ->assertOk()
            ->json('data');

        $this->assertSame(2, $progress['students']['total']);
        $this->assertSame(2, $progress['enrollments']['total']);
        $this->assertSame('active', $progress['students']['by_status'][0]['status']);
        $this->assertSame('male', $progress['students']['by_gender'][0]['gender']);
        $this->assertSame('active', $progress['enrollments']['by_status'][0]['status']);
        $this->assertSame(1, $progress['scholarships']['active_awards']);
        $this->assertSame('merit', $progress['scholarships']['by_type'][0]['type']);
        $this->assertSame(1, $progress['scholarships']['by_type'][0]['awards']);
    }

    public function test_attendance_summary_computes_rate(): void
    {
        $this->attendance($this->ali, '2026-09-02', 'present');
        $this->attendance($this->ali, '2026-09-03', 'late');
        $this->attendance($this->ali, '2026-09-04', 'absent');

        $data = $this->api($this->admin)
            ->getJson('/api/v1/reports/attendance?from=2026-09-01&to=2026-09-30')
            ->assertOk()
            ->json('data');

        $this->assertSame(3, $data['totals']['total']);
        $this->assertSame(2, $data['totals']['present'] + $data['totals']['late']);
        $this->assertSame(1, $data['totals']['absent']);
        $this->assertSame(66.67, (float) $data['totals']['attendance_percentage']);
        $this->assertCount(1, $data['by_class']);
    }

    public function test_result_summary_reports_pass_fail_and_average(): void
    {
        $paper = ExamPaper::query()->where('exam_id', $this->exam->id)->firstOrFail();

        ExamMark::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'exam_id' => $this->exam->id, 'exam_paper_id' => $paper->id,
            'student_id' => $this->ali->id, 'class_room_id' => $this->class->id,
            'subject_id' => $paper->subject_id,
            'marks_obtained' => 90, 'is_absent' => false,
        ]);
        ExamMark::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'exam_id' => $this->exam->id, 'exam_paper_id' => $paper->id,
            'student_id' => $this->sara->id, 'class_room_id' => $this->class->id,
            'subject_id' => $paper->subject_id,
            'marks_obtained' => 30, 'is_absent' => false,
        ]);

        $data = $this->api($this->admin)
            ->getJson("/api/v1/reports/results/{$this->exam->id}")
            ->assertOk()
            ->json('data');

        $this->assertSame(2, $data['totals']['graded']);
        $this->assertSame(1, $data['totals']['passed']);
        $this->assertSame(1, $data['totals']['failed']);
        $this->assertSame(50.0, (float) $data['totals']['pass_percentage']);
        $this->assertSame(60.0, (float) $data['totals']['average_percentage']);
        $this->assertCount(1, $data['by_paper']);
    }

    public function test_student_yearly_analysis_consolidates_history(): void
    {
        $this->attendance($this->ali, '2026-09-02', 'present');
        $this->attendance($this->ali, '2026-09-03', 'present');

        $data = $this->api($this->admin)
            ->getJson("/api/v1/reports/students/{$this->ali->id}/yearly")
            ->assertOk()
            ->json('data');

        $this->assertSame($this->ali->id, $data['student']['id']);
        $this->assertCount(1, $data['years']);
        $this->assertSame('2026-2027', $data['years'][0]['academic_year']);
        $this->assertSame(2, $data['years'][0]['attendance']['total']);
        $this->assertSame(100.0, (float) $data['years'][0]['attendance']['attendance_percentage']);
    }

    public function test_staff_financial_and_payroll_reports(): void
    {
        StaffMember::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'employee_no' => 'EMP-0002', 'first_name' => 'Bilal', 'last_name' => 'Ahmed',
            'employment_type' => 'contract', 'status' => 'active', 'joining_date' => '2026-02-01',
        ]);

        $staff = $this->api($this->admin)
            ->getJson('/api/v1/reports/staff')
            ->assertOk()
            ->json('data');
        $this->assertSame(1, $staff['headcount']['total']);

        PayrollRun::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'period' => '2026-09', 'status' => 'approved',
            'total_gross' => 100000, 'total_deductions' => 10000, 'total_net' => 90000,
        ]);

        $payroll = $this->api($this->admin)
            ->getJson('/api/v1/reports/payroll?from=2026-09-01&to=2026-09-30')
            ->assertOk()
            ->json('data');
        $this->assertSame(1, $payroll['totals']['runs']);
        $this->assertSame(90000.0, (float) $payroll['totals']['net']);

        $financial = $this->api($this->admin)
            ->getJson('/api/v1/reports/financial')
            ->assertOk()
            ->json('data');
        $this->assertArrayHasKey('income', $financial);
        $this->assertArrayHasKey('surplus', $financial);
    }

    public function test_institution_overview_is_available_to_institution_head(): void
    {
        $otherCampus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus B', 'code' => 'B', 'type' => CampusType::School->value,
        ]);
        Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $otherCampus->id,
            'admission_no' => 'B-1',
            'first_name' => 'Noor', 'last_name' => 'Khan', 'gender' => 'female',
            'status' => 'active',
        ]);

        $head = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => null,
        ]);
        $head->syncRoles([RoleName::InstitutionHead->value]);

        $data = $this->api($head)
            ->getJson('/api/v1/reports/institution-overview')
            ->assertOk()
            ->json('data');

        $this->assertSame(2, $data['totals']['campuses']);
        $this->assertSame(3, $data['totals']['students']);
        $this->assertCount(2, $data['campuses']);
        $this->assertEqualsCanonicalizing(
            [$this->campus->id, $otherCampus->id],
            array_column($data['campuses'], 'id')
        );
    }

    public function test_institution_head_can_filter_campus_dashboard(): void
    {
        $otherCampus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus B', 'code' => 'B', 'type' => CampusType::School->value,
        ]);
        Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $otherCampus->id,
            'admission_no' => 'B-1',
            'first_name' => 'Noor', 'last_name' => 'Khan', 'gender' => 'female',
            'status' => 'active',
        ]);

        $head = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => null,
        ]);
        $head->syncRoles([RoleName::InstitutionHead->value]);

        $all = $this->api($head)
            ->getJson('/api/v1/reports/campus-dashboard')
            ->assertOk()
            ->json('data');
        $this->assertSame(3, $all['students_active']);

        $filtered = $this->api($head)
            ->withHeaders(['X-Campus-Id' => (string) $this->campus->id])
            ->getJson('/api/v1/reports/campus-dashboard')
            ->assertOk()
            ->json('data');
        $this->assertSame(2, $filtered['students_active']);
    }

    public function test_campus_admin_cannot_access_institution_overview(): void
    {
        $this->api($this->admin)
            ->getJson('/api/v1/reports/institution-overview')
            ->assertStatus(403);
    }

    public function test_institution_head_cannot_access_platform_overview(): void
    {
        $head = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => null,
        ]);
        $head->syncRoles([RoleName::InstitutionHead->value]);

        $this->api($head)
            ->getJson('/api/v1/reports/platform-overview')
            ->assertStatus(403);
    }

    public function test_platform_overview_is_available_to_super_user(): void
    {
        $super = User::factory()->create([
            'institution_id' => null,
            'campus_id' => null,
        ]);
        $super->syncRoles([RoleName::PlatformAdmin->value]);

        $data = $this->api($super)
            ->getJson('/api/v1/reports/platform-overview')
            ->assertOk()
            ->json('data');

        $this->assertSame(1, $data['totals']['institutions']);
        $this->assertSame(2, $data['totals']['students']);
        $this->assertSame($this->institution->id, $data['institutions'][0]['id']);
    }

    public function test_reports_require_permission(): void
    {
        $nobody = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);

        $this->api($nobody)
            ->getJson('/api/v1/reports/campus-dashboard')
            ->assertStatus(403);

        $this->api($this->actor(RoleName::AcademicCoordinator))
            ->getJson('/api/v1/reports/progress')
            ->assertOk();
    }

    public function test_attendance_series_is_bucketed_by_granularity(): void
    {
        $this->attendance($this->ali, '2026-09-02', 'present');
        $this->attendance($this->ali, '2026-09-08', 'absent');

        $daily = $this->api($this->admin)
            ->getJson('/api/v1/reports/attendance?from=2026-09-01&to=2026-09-10&granularity=day')
            ->assertOk()
            ->json('data');

        $this->assertSame('day', $daily['period']['granularity']);
        $this->assertCount(10, $daily['series']);
        $this->assertSame('2026-09-01', $daily['series'][0]['key']);
        $this->assertSame(1, $daily['series'][1]['total']);
        $this->assertSame(1, $daily['series'][7]['absent']);

        $weekly = $this->api($this->admin)
            ->getJson('/api/v1/reports/attendance?from=2026-09-01&to=2026-09-30&granularity=week')
            ->assertOk()
            ->json('data');

        $this->assertSame('week', $weekly['period']['granularity']);
        $this->assertSame('2026-08-31', $weekly['series'][0]['key']);
        $this->assertSame(2, array_sum(array_column($weekly['series'], 'total')));
        $this->assertSame(
            1,
            (int) collect($weekly['series'])->where('key', '2026-09-07')->first()['absent']
        );
    }

    public function test_progress_series_tracks_admissions_and_enrollments(): void
    {
        StudentEnrollment::query()->update(['starts_on' => '2026-04-05']);

        $data = $this->api($this->admin)
            ->getJson('/api/v1/reports/progress?from=2026-04-01&to=2027-03-31&granularity=year&academic_year_id='.$this->year->id)
            ->assertOk()
            ->json('data');

        $this->assertSame('year', $data['period']['granularity']);
        $this->assertCount(2, $data['series']);
        $this->assertSame('2026-01-01', $data['series'][0]['key']);
        $this->assertSame(2, $data['series'][0]['enrollments']);
        $this->assertArrayHasKey('period', $data);
    }

    public function test_campus_comparison_aggregates_institution_campuses(): void
    {
        $otherCampus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus B', 'code' => 'B', 'type' => CampusType::School->value,
        ]);
        Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $otherCampus->id,
            'admission_no' => 'B-1',
            'first_name' => 'Noor', 'last_name' => 'Khan', 'gender' => 'female',
            'status' => 'active',
        ]);
        $this->attendance($this->ali, '2026-09-02', 'present');

        $head = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => null,
        ]);
        $head->syncRoles([RoleName::InstitutionHead->value]);

        $data = $this->api($head)
            ->getJson('/api/v1/reports/campus-comparison?from=2026-09-01&to=2026-09-30&granularity=month')
            ->assertOk()
            ->json('data');

        $this->assertSame(2, $data['totals']['campuses']);
        $this->assertSame(3, $data['totals']['students']);
        $this->assertCount(2, $data['campuses']);
        $this->assertSame('month', $data['period']['granularity']);

        $campusA = collect($data['campuses'])->firstWhere('campus_id', $this->campus->id);
        $this->assertSame(2, $campusA['students']);
        $this->assertSame(2, $campusA['active_students']);
        $this->assertSame(0, $campusA['admissions']);
        $this->assertSame(100.0, (float) $campusA['attendance_percentage']);

        $this->api($this->admin)
            ->getJson('/api/v1/reports/campus-comparison')
            ->assertStatus(403);
    }

    public function test_reports_reject_invalid_granularity(): void
    {
        $this->api($this->admin)
            ->getJson('/api/v1/reports/progress?granularity=decade')
            ->assertStatus(422);
    }

    public function test_campus_report_summarises_income_payments_students_and_staff(): void
    {
        $this->seedCampusFigures();

        $data = $this->api($this->admin)
            ->getJson('/api/v1/reports/campus?from=2026-09-01&to=2026-09-30')
            ->assertOk()
            ->json('data');

        $this->assertSame($this->campus->id, $data['campus']['id']);
        $this->assertSame('2026-09-01', $data['filters']['from']);

        $this->assertSame(1150.0, (float) $data['income_breakdown']['received']);
        $this->assertSame(900.0, (float) $data['income_breakdown']['fees']);
        $this->assertSame(250.0, (float) $data['income_breakdown']['other']);
        $this->assertSame(1150.0, (float) $data['income']);
        $this->assertSame(600.0, (float) $data['receivable']);

        $this->assertSame(300.0, (float) $data['payments_breakdown']['salaries']);
        $this->assertSame(100.0, (float) $data['payments_breakdown']['utilities']);
        $this->assertSame(400.0, (float) $data['payments_breakdown']['others']);
        $this->assertSame(800.0, (float) $data['payments']);
        $this->assertSame(400.0, (float) $data['payable']);
        $this->assertSame(350.0, (float) $data['balance']);

        $this->assertSame(3, $data['students']['total']);
        $this->assertSame(1, $data['students']['new_admissions']);
        $this->assertSame(1, $data['students']['withdrawals']);
        $this->assertSame(2, $data['students']['ongoing']);

        $this->assertSame(2, $data['staff']['total']);
        $this->assertSame(1, $data['staff']['teaching']);
        $this->assertSame(1, $data['staff']['non_teaching']);
        $this->assertSame(1, $data['staff']['males']);
        $this->assertSame(1, $data['staff']['females']);
        $this->assertSame(1, $data['staff']['hired']);
        $this->assertSame(1, $data['staff']['fired']);
    }

    public function test_campus_admin_cannot_open_another_campus_report(): void
    {
        $otherCampus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus B', 'code' => 'B', 'type' => CampusType::School->value,
        ]);

        $this->api($this->admin)
            ->getJson('/api/v1/reports/campus?campus_id='.$otherCampus->id)
            ->assertStatus(403);
    }

    public function test_head_office_report_rolls_up_campuses_and_reconciles(): void
    {
        $this->seedCampusFigures();

        $otherCampus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus B', 'code' => 'B', 'type' => CampusType::School->value,
        ]);

        $plan = FeePlan::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $otherCampus->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'name' => 'Campus B plan',
        ]);

        FeeVoucher::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $otherCampus->id,
            'student_id' => $this->sara->id,
            'academic_year_id' => $this->year->id,
            'fee_plan_id' => $plan->id,
            'sequence' => 1,
            'voucher_no' => 'B-V1',
            'due_date' => '2026-09-10',
            'gross_amount' => 800,
            'amount' => 800,
            'paid_amount' => 800,
            'status' => 'paid',
        ]);

        $campusBAccounts = app(DefaultChartOfAccounts::class)->seed($otherCampus);

        $this->postLedgerEntry($otherCampus, [
            [$campusBAccounts->get('5050'), 300, 0],
            [$campusBAccounts->get('1020'), 0, 300],
        ], '2026-09-12');

        $head = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => null,
        ]);
        $head->syncRoles([RoleName::InstitutionHead->value]);

        $data = $this->api($head)
            ->getJson('/api/v1/reports/head-office?from=2026-09-01&to=2026-09-30')
            ->assertOk()
            ->json('data');

        $this->assertSame(2, $data['totals']['campuses']);
        $this->assertCount(2, $data['campuses']);

        $campusA = collect($data['campuses'])->firstWhere('campus_id', $this->campus->id);
        $this->assertSame(1150.0, (float) $campusA['income']);
        $this->assertSame(800.0, (float) $campusA['payments']);
        $this->assertSame(350.0, (float) $campusA['balance']);
        $this->assertSame(600.0, (float) $campusA['receivable']);
        $this->assertSame(400.0, (float) $campusA['payable']);

        $campusB = collect($data['campuses'])->firstWhere('campus_id', $otherCampus->id);
        $this->assertSame(0.0, (float) $campusB['income']);
        $this->assertSame(300.0, (float) $campusB['payments']);
        $this->assertSame(-300.0, (float) $campusB['balance']);

        $this->assertSame(1150.0, (float) $data['totals']['income']);
        $this->assertSame(1100.0, (float) $data['totals']['payments']);
        $this->assertSame(50.0, (float) $data['totals']['balance']);
        $this->assertSame(600.0, (float) $data['totals']['receivable']);
        $this->assertSame(400.0, (float) $data['totals']['payable']);

        $campusOnly = $this->api($this->admin)
            ->getJson('/api/v1/reports/campus?from=2026-09-01&to=2026-09-30')
            ->assertOk()
            ->json('data');

        foreach (['income', 'payments', 'balance', 'receivable', 'payable'] as $key) {
            $this->assertSame(
                (float) $campusA[$key],
                (float) $campusOnly[$key],
                "Head office row for {$key} must match the campus report."
            );
        }
    }

    public function test_campus_admin_cannot_access_head_office_report(): void
    {
        $this->api($this->admin)
            ->getJson('/api/v1/reports/head-office')
            ->assertStatus(403);
    }

    private function seedCampusFigures(): void
    {
        $plan = FeePlan::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'name' => 'Standard plan',
        ]);

        FeeVoucher::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $this->ali->id,
            'academic_year_id' => $this->year->id,
            'fee_plan_id' => $plan->id,
            'sequence' => 1,
            'voucher_no' => 'V-1',
            'due_date' => '2026-09-05',
            'gross_amount' => 1000,
            'amount' => 1000,
            'paid_amount' => 400,
            'status' => 'partial',
        ]);

        FeeVoucher::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $this->sara->id,
            'academic_year_id' => $this->year->id,
            'fee_plan_id' => $plan->id,
            'sequence' => 2,
            'voucher_no' => 'V-2',
            'due_date' => '2026-09-10',
            'gross_amount' => 500,
            'amount' => 500,
            'paid_amount' => 500,
            'status' => 'paid',
        ]);

        FeePayment::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $this->ali->id,
            'receipt_no' => 'R-1',
            'payment_date' => '2026-09-06',
            'amount' => 400,
            'method' => 'cash',
            'status' => 'posted',
        ]);

        FeePayment::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $this->sara->id,
            'receipt_no' => 'R-2',
            'payment_date' => '2026-09-11',
            'amount' => 500,
            'method' => 'cash',
            'status' => 'posted',
        ]);

        $source = IncomeSource::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Hall rent', 'code' => 'HALL', 'category' => 'other',
        ]);

        OtherIncome::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'income_source_id' => $source->id,
            'receipt_no' => 'OI-1',
            'received_on' => '2026-09-08',
            'amount' => 250,
            'method' => 'cash',
            'status' => 'posted',
        ]);

        $accounts = app(DefaultChartOfAccounts::class)->seed($this->campus);

        $this->postLedger([
            [$accounts->get('5010'), 300, 0],
            [$accounts->get('1020'), 0, 300],
        ], '2026-09-15');

        $this->postLedger([
            [$accounts->get('5020'), 100, 0],
            [$accounts->get('1020'), 0, 100],
        ], '2026-09-16');

        $this->postLedger([
            [$accounts->get('5030'), 400, 0],
            [$accounts->get('2010'), 0, 400],
        ], '2026-09-18');

        Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'admission_no' => 'ADM-3',
            'first_name' => 'Hina', 'last_name' => 'Shah', 'gender' => 'female',
            'status' => 'active',
            'admission_date' => '2026-09-03',
        ]);

        $this->sara->update(['status' => 'withdrawn']);
        StudentEnrollment::query()
            ->where('student_id', $this->sara->id)
            ->update(['status' => 'withdrawn', 'ends_on' => '2026-09-15']);

        StaffMember::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'user_id' => $this->teacher->id,
            'employee_no' => 'EMP-1001', 'first_name' => 'Imran', 'last_name' => 'Yousaf',
            'gender' => 'male', 'employment_type' => 'permanent', 'status' => 'active',
            'joining_date' => '2025-01-01',
        ]);

        TeachingAssignment::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'academic_year_id' => $this->year->id,
            'teacher_user_id' => $this->teacher->id,
            'subject_id' => Subject::query()->firstOrFail()->id,
            'class_room_id' => $this->class->id,
            'is_active' => true,
        ]);

        StaffMember::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'employee_no' => 'EMP-1002', 'first_name' => 'Nadia', 'last_name' => 'Iqbal',
            'gender' => 'female', 'employment_type' => 'contract', 'status' => 'active',
            'joining_date' => '2026-09-01',
        ]);

        StaffMember::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'employee_no' => 'EMP-1003', 'first_name' => 'Kamran', 'last_name' => 'Ali',
            'gender' => 'male', 'employment_type' => 'contract', 'status' => 'resigned',
            'joining_date' => '2024-01-01', 'leaving_date' => '2026-09-20',
        ]);
    }

    /**
     * @param  array<int, array{0: ChartOfAccount, 1: float|int, 2: float|int}>  $lines
     */
    private function postLedger(array $lines, string $date): void
    {
        $this->postLedgerEntry($this->campus, $lines, $date);
    }

    /**
     * @param  array<int, array{0: ChartOfAccount, 1: float|int, 2: float|int}>  $lines
     */
    private function postLedgerEntry(Campus $campus, array $lines, string $date): void
    {
        $fiscalYear = FiscalYear::firstOrCreate(
            ['campus_id' => $campus->id, 'code' => 'FY27'],
            [
                'institution_id' => $campus->institution_id,
                'name' => 'FY 2026-2027',
                'starts_on' => '2026-07-01',
                'ends_on' => '2027-06-30',
                'status' => 'open',
                'is_current' => true,
            ]
        );

        $entry = JournalEntry::create([
            'institution_id' => $campus->institution_id,
            'campus_id' => $campus->id,
            'fiscal_year_id' => $fiscalYear->id,
            'reference' => 'JV-'.strtoupper(uniqid()),
            'entry_date' => $date,
            'status' => 'posted',
            'memo' => 'Report test entry',
            'total_debit' => array_sum(array_map(fn ($line) => (float) $line[1], $lines)),
            'total_credit' => array_sum(array_map(fn ($line) => (float) $line[2], $lines)),
        ]);

        foreach ($lines as $index => [$account, $debit, $credit]) {
            $entry->lines()->create([
                'chart_of_account_id' => $account->id,
                'line_no' => $index + 1,
                'description' => 'Report test',
                'debit' => $debit,
                'credit' => $credit,
            ]);
        }
    }

    private function attendance(Student $student, string $date, string $status): void
    {
        StudentAttendance::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $student->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'attendance_date' => $date,
            'status' => $status,
            'marked_by' => $this->teacher->id,
        ]);
    }

    private function student(string $admissionNo, string $first, string $last, Section $section): Student
    {
        $student = Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'admission_no' => $admissionNo,
            'first_name' => $first, 'last_name' => $last, 'gender' => 'male',
            'status' => 'active',
        ]);

        StudentEnrollment::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $student->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'section_id' => $section->id,
            'status' => 'active',
        ]);

        return $student;
    }

    private function actor(RoleName $role): User
    {
        $user = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $user->syncRoles([$role->value]);

        return $user;
    }

    private function api(User $user): self
    {
        $this->app['auth']->forgetGuards();

        $this->withToken($user->createToken('t')->plainTextToken);

        return $this;
    }
}
