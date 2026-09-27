<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\ExamStatus;
use App\Enums\RoleName;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ClassRoom;
use App\Models\Exam;
use App\Models\ExamMark;
use App\Models\ExamType;
use App\Models\Institution;
use App\Models\Section;
use App\Models\Stage;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\Subject;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExamAdjustmentTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private User $teacher;

    private AcademicYear $year;

    private ClassRoom $class;

    private Subject $subject;

    private Exam $exam;

    private Student $ali;

    private Student $sara;

    private int $paperId;

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

        $this->subject = Subject::create([
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
            'status' => ExamStatus::Scheduled->value,
        ]);

        $this->ali = $this->student('ADM-1', 'Ali', 'Raza', $section);
        $this->sara = $this->student('ADM-2', 'Sara', 'Khan', $section);

        $this->createDefaultScale();

        $this->paperId = (int) $this->api($this->admin)->postJson('/api/v1/exam-papers', [
            'exam_id' => $this->exam->id,
            'class_room_id' => $this->class->id,
            'subject_id' => $this->subject->id,
            'exam_date' => '2026-09-02',
            'max_marks' => 100,
            'pass_marks' => 40,
        ])->assertStatus(201)->json('data.id');
    }

    public function test_grace_marks_moderation_raises_effective_marks(): void
    {
        $this->enterMarks($this->ali, 50);
        $this->enterMarks($this->sara, 30);

        $moderation = $this->api($this->admin)->postJson('/api/v1/exam-moderations', [
            'exam_paper_id' => $this->paperId, 'type' => 'grace_marks', 'value' => 10,
            'reason' => 'Question 5 was out of syllabus',
        ])->assertStatus(201)->assertJsonPath('data.status', 'pending')->json('data');

        $this->api($this->teacher)
            ->postJson("/api/v1/exam-moderations/{$moderation['id']}/approve")
            ->assertStatus(403);

        $this->api($this->admin)
            ->postJson("/api/v1/exam-moderations/{$moderation['id']}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->api($this->admin)
            ->postJson("/api/v1/exam-moderations/{$moderation['id']}/apply")
            ->assertOk()
            ->assertJsonPath('data.status', 'applied');

        $this->assertSame(60.0, $this->effectiveMarks($this->ali));
        $this->assertSame(40.0, $this->effectiveMarks($this->sara));

        $card = $this->api($this->admin)
            ->getJson("/api/v1/exams/{$this->exam->id}/students/{$this->ali->id}/result-card")
            ->assertOk()
            ->json('data');

        $this->assertSame(60.0, (float) $card['total_obtained']);
        $this->assertSame('pass', $card['result']);
    }

    public function test_scaling_moderation_raises_marks_by_percentage(): void
    {
        $this->enterMarks($this->ali, 50);

        $moderation = $this->api($this->admin)->postJson('/api/v1/exam-moderations', [
            'exam_paper_id' => $this->paperId, 'type' => 'scaling', 'value' => 20,
        ])->assertStatus(201)->json('data');

        $this->api($this->admin)->postJson("/api/v1/exam-moderations/{$moderation['id']}/approve")->assertOk();
        $this->api($this->admin)->postJson("/api/v1/exam-moderations/{$moderation['id']}/apply")->assertOk();

        $this->assertSame(60.0, $this->effectiveMarks($this->ali));
    }

    public function test_reevaluation_can_revise_marks(): void
    {
        $this->enterMarks($this->sara, 30);

        $reevaluation = $this->api($this->admin)->postJson('/api/v1/exam-reevaluations', [
            'exam_paper_id' => $this->paperId, 'student_id' => $this->sara->id,
            'reason' => 'Total appears mis-added',
        ])->assertStatus(201)
            ->assertJsonPath('data.status', 'requested')
            ->assertJsonPath('data.original_marks', 30)
            ->json('data');

        $this->api($this->admin)->postJson("/api/v1/exam-reevaluations/{$reevaluation['id']}/review", [
            'status' => 'under_review',
        ])->assertOk()->assertJsonPath('data.status', 'under_review');

        $this->api($this->admin)->postJson("/api/v1/exam-reevaluations/{$reevaluation['id']}/review", [
            'status' => 'approved', 'revised_marks' => 45, 'remarks' => 'Rechecked, marks added',
        ])->assertOk()->assertJsonPath('data.status', 'approved');

        $this->assertSame(45.0, $this->effectiveMarks($this->sara));

        $card = $this->api($this->admin)
            ->getJson("/api/v1/exams/{$this->exam->id}/students/{$this->sara->id}/result-card")
            ->assertOk()
            ->json('data');

        $this->assertSame('pass', $card['result']);
    }

    public function test_supplementary_registration_for_failed_students(): void
    {
        $this->enterMarks($this->ali, 90);
        $this->enterMarks($this->sara, 30);

        $eligible = $this->api($this->admin)
            ->getJson("/api/v1/exams/{$this->exam->id}/supplementary-eligible?class_room_id={$this->class->id}")
            ->assertOk()
            ->json('data');

        $this->assertCount(1, $eligible);
        $this->assertSame($this->sara->id, $eligible[0]['student_id']);

        $supplementary = $this->api($this->admin)->postJson('/api/v1/exam-supplementaries', [
            'original_exam_id' => $this->exam->id,
            'exam_paper_id' => $this->paperId,
            'student_id' => $this->sara->id,
            'fee_amount' => 500, 'is_paid' => true,
        ])->assertStatus(201)
            ->assertJsonPath('data.status', 'registered')
            ->assertJsonPath('data.subject_id', $this->subject->id)
            ->json('data');

        $this->api($this->admin)
            ->postJson("/api/v1/exam-supplementaries/{$supplementary['id']}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->api($this->admin)
            ->postJson("/api/v1/exam-supplementaries/{$supplementary['id']}/complete")
            ->assertOk()
            ->assertJsonPath('data.status', 'completed');

        $this->api($this->admin)
            ->getJson('/api/v1/exam-supplementaries?student_id='.$this->sara->id)
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    private function enterMarks(Student $student, float $marks): void
    {
        $this->api($this->admin)->postJson('/api/v1/exam-marks/bulk', [
            'exam_paper_id' => $this->paperId,
            'marks' => [['student_id' => $student->id, 'marks_obtained' => $marks]],
        ])->assertOk();
    }

    private function effectiveMarks(Student $student): float
    {
        $mark = ExamMark::query()
            ->where('exam_paper_id', $this->paperId)
            ->where('student_id', $student->id)
            ->firstOrFail();

        return (float) $mark->effective_marks;
    }

    private function createDefaultScale(): void
    {
        $this->api($this->admin)->postJson('/api/v1/grade-scales', [
            'name' => 'Default Scale', 'code' => 'DEF', 'is_default' => true,
            'items' => [
                ['grade' => 'A', 'min_percentage' => 80, 'max_percentage' => 100, 'points' => 4],
                ['grade' => 'B', 'min_percentage' => 60, 'max_percentage' => 79.99, 'points' => 3],
                ['grade' => 'F', 'min_percentage' => 0, 'max_percentage' => 59.99, 'points' => 0],
            ],
        ])->assertStatus(201);
    }

    private function student(string $admissionNo, string $first, string $last, Section $section): Student
    {
        $student = Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'admission_no' => $admissionNo,
            'first_name' => $first, 'last_name' => $last, 'gender' => 'male',
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
