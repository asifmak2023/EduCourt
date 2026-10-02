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
use App\Models\FeePlan;
use App\Models\FeeVoucher;
use App\Models\Guardian;
use App\Models\Institution;
use App\Models\Section;
use App\Models\Stage;
use App\Models\Student;
use App\Models\StudentAttendance;
use App\Models\StudentEnrollment;
use App\Models\Subject;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PortalTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private AcademicYear $year;

    private ClassRoom $class;

    private Section $section;

    private Student $ali;

    private Student $sara;

    private User $aliUser;

    private User $parentUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->institution = Institution::create(['name' => 'Test Trust', 'code' => 'TT']);
        $this->campus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus A', 'code' => 'A', 'type' => CampusType::School->value,
        ]);

        $this->year = AcademicYear::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => '2026-2027', 'code' => 'AY',
            'starts_on' => '2026-04-01', 'ends_on' => '2027-03-31', 'status' => 'active',
            'is_current' => true,
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

        $this->section = Section::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'class_room_id' => $this->class->id, 'name' => 'A',
        ]);

        $this->aliUser = $this->actor(RoleName::Student);
        $this->parentUser = $this->actor(RoleName::ParentGuardian);

        $this->ali = $this->student('ADM-1', 'Ali', 'Raza', $this->aliUser);
        $this->sara = $this->student('ADM-2', 'Sara', 'Khan', null);

        $guardian = Guardian::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'user_id' => $this->parentUser->id,
            'name' => 'Parent Khan',
            'phone' => '0300-0000000',
        ]);
        $guardian->students()->attach($this->sara->id, ['relationship' => 'father', 'is_primary' => true]);

        StudentAttendance::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $this->ali->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'section_id' => $this->section->id,
            'attendance_date' => now()->toDateString(),
            'status' => 'present',
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

        $exam = Exam::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'academic_year_id' => $this->year->id,
            'exam_type_id' => $examType->id,
            'name' => 'Mid Term 2026',
            'starts_on' => '2026-09-01', 'ends_on' => '2026-09-10',
            'status' => 'scheduled',
        ]);

        $paper = ExamPaper::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'exam_id' => $exam->id,
            'class_room_id' => $this->class->id,
            'subject_id' => $subject->id,
            'exam_date' => '2026-09-02',
            'max_marks' => 100, 'pass_marks' => 40,
        ]);

        ExamMark::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'exam_id' => $exam->id,
            'exam_paper_id' => $paper->id,
            'student_id' => $this->ali->id,
            'class_room_id' => $this->class->id,
            'subject_id' => $subject->id,
            'marks_obtained' => 90,
        ]);

        $plan = FeePlan::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'name' => 'Class 1 Plan',
        ]);

        FeeVoucher::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $this->sara->id,
            'academic_year_id' => $this->year->id,
            'fee_plan_id' => $plan->id,
            'sequence' => 1,
            'voucher_no' => 'V-1',
            'due_date' => '2026-05-01',
            'gross_amount' => 10000,
            'amount' => 10000,
            'paid_amount' => 2500,
            'status' => 'partial',
        ]);
    }

    public function test_a_student_sees_their_own_profile(): void
    {
        $this->as($this->aliUser)
            ->getJson('/api/v1/me/children')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $this->ali->id)
            ->assertJsonPath('data.0.full_name', 'Ali Raza');
    }

    public function test_a_parent_sees_their_children(): void
    {
        $this->as($this->parentUser)
            ->getJson('/api/v1/me/children')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $this->sara->id)
            ->assertJsonPath('data.0.full_name', 'Sara Khan');
    }

    public function test_a_student_can_read_their_attendance_summary(): void
    {
        $this->as($this->aliUser)
            ->getJson('/api/v1/me/attendance')
            ->assertOk()
            ->assertJsonPath('summary.present', 1)
            ->assertJsonPath('summary.marked', 1)
            ->assertJsonPath('student.id', $this->ali->id);
    }

    public function test_a_student_can_read_their_results(): void
    {
        $this->as($this->aliUser)
            ->getJson('/api/v1/me/results')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.result', 'pass')
            ->assertJsonPath('data.0.total_obtained', fn ($value) => (float) $value === 90.0);
    }

    public function test_the_student_timetable_endpoint_returns_ok(): void
    {
        $this->as($this->aliUser)
            ->getJson('/api/v1/me/timetable')
            ->assertOk();
    }

    public function test_a_parent_can_read_child_fees(): void
    {
        $this->as($this->parentUser)
            ->getJson('/api/v1/me/fees')
            ->assertOk()
            ->assertJsonPath('totals.billed', '10000.00')
            ->assertJsonPath('totals.paid', '2500.00')
            ->assertJsonPath('totals.outstanding', '7500.00')
            ->assertJsonCount(1, 'data');
    }

    public function test_a_student_can_read_their_own_fees(): void
    {
        $plan = FeePlan::query()->firstOrFail();

        FeeVoucher::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $this->ali->id,
            'academic_year_id' => $this->year->id,
            'fee_plan_id' => $plan->id,
            'sequence' => 1,
            'voucher_no' => 'V-ALI-1',
            'due_date' => '2026-05-01',
            'gross_amount' => 8000,
            'amount' => 8000,
            'paid_amount' => 8000,
            'status' => 'paid',
        ]);

        $this->as($this->aliUser)
            ->getJson('/api/v1/me/fees')
            ->assertOk()
            ->assertJsonPath('student.id', $this->ali->id)
            ->assertJsonPath('totals.billed', '8000.00')
            ->assertJsonPath('totals.outstanding', '0.00')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.voucher_no', 'V-ALI-1');
    }

    public function test_a_parent_cannot_read_another_students_data(): void
    {
        $this->as($this->parentUser)
            ->getJson("/api/v1/me/attendance?student_id={$this->ali->id}")
            ->assertStatus(404);
    }

    public function test_a_user_without_a_linked_student_is_forbidden(): void
    {
        $teacher = $this->actor(RoleName::Teacher);

        $this->as($teacher)
            ->getJson('/api/v1/me/children')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->as($teacher)
            ->getJson('/api/v1/me/attendance')
            ->assertStatus(403);
    }

    private function student(string $admissionNo, string $first, string $last, ?User $user): Student
    {
        $student = Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'user_id' => $user?->id,
            'admission_no' => $admissionNo,
            'first_name' => $first, 'last_name' => $last, 'gender' => 'male',
        ]);

        StudentEnrollment::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $student->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'section_id' => $this->section->id,
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

    private function as(User $user): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('t')->plainTextToken);
    }
}
