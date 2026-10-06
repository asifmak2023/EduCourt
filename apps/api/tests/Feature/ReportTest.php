<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ClassRoom;
use App\Models\Exam;
use App\Models\ExamMark;
use App\Models\ExamPaper;
use App\Models\ExamType;
use App\Models\Institution;
use App\Models\PayrollRun;
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

        $progress = $this->api($this->admin)
            ->getJson('/api/v1/reports/progress?academic_year_id='.$this->year->id)
            ->assertOk()
            ->json('data');

        $this->assertSame(2, $progress['students']['total']);
        $this->assertSame(2, $progress['enrollments']['total']);
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
