<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Enums\ScholarshipAwardStatus;
use App\Enums\ScholarshipDiscountType;
use App\Enums\ScholarshipType;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ClassRoom;
use App\Models\Exam;
use App\Models\ExamMark;
use App\Models\ExamPaper;
use App\Models\ExamType;
use App\Models\Institution;
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
use App\Models\User;
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
