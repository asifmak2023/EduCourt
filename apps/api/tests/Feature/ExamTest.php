<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\ExamStatus;
use App\Enums\InvigilationRole;
use App\Enums\RoleName;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ClassRoom;
use App\Models\Exam;
use App\Models\ExamType;
use App\Models\Institution;
use App\Models\Section;
use App\Models\Stage;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\Subject;
use App\Models\TeachingAssignment;
use App\Models\User;
use App\Services\Exams\ResultService;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExamTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private User $teacher;

    private AcademicYear $year;

    private ClassRoom $class;

    private Subject $subject;

    private ExamType $examType;

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

        $this->subject = Subject::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Mathematics', 'code' => 'MATH', 'type' => 'core',
        ]);

        $this->examType = ExamType::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Mid Term', 'code' => 'MID', 'weightage' => 40,
        ]);

        $this->exam = Exam::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'academic_year_id' => $this->year->id,
            'exam_type_id' => $this->examType->id,
            'name' => 'Mid Term 2026',
            'starts_on' => '2026-09-01', 'ends_on' => '2026-09-10',
            'status' => ExamStatus::Scheduled->value,
        ]);

        $this->ali = $this->student('ADM-1', 'Ali', 'Raza', $section);
        $this->sara = $this->student('ADM-2', 'Sara', 'Khan', $section);
    }

    public function test_exam_type_exam_and_paper_can_be_created(): void
    {
        $type = $this->api($this->admin)->postJson('/api/v1/exam-types', [
            'name' => 'Final Term', 'code' => 'FIN', 'weightage' => 60,
        ])->assertStatus(201)->json('data');

        $this->assertSame('FIN', $type['code']);

        $paper = $this->api($this->admin)->postJson('/api/v1/exam-papers', [
            'exam_id' => $this->exam->id,
            'class_room_id' => $this->class->id,
            'subject_id' => $this->subject->id,
            'exam_date' => '2026-09-02',
            'starts_at' => '09:00',
            'ends_at' => '11:00',
            'max_marks' => 100,
            'pass_marks' => 40,
        ])->assertStatus(201)
            ->assertJsonPath('data.max_marks', '100.00')
            ->json('data');

        $this->api($this->admin)
            ->getJson('/api/v1/exam-papers?exam_id='.$this->exam->id)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $paper['id']);
    }

    public function test_grade_scale_returns_grade_for_percentage(): void
    {
        $this->api($this->admin)->postJson('/api/v1/grade-scales', [
            'name' => 'Default Scale', 'code' => 'DEF', 'is_default' => true,
            'items' => [
                ['grade' => 'A', 'min_percentage' => 80, 'max_percentage' => 100, 'points' => 4],
                ['grade' => 'B', 'min_percentage' => 60, 'max_percentage' => 79.99, 'points' => 3],
                ['grade' => 'F', 'min_percentage' => 0, 'max_percentage' => 59.99, 'points' => 0],
            ],
        ])->assertStatus(201)->assertJsonCount(3, 'data.items');

        $scale = app(ResultService::class)->defaultScale($this->campus->id);
        $this->assertSame('A', $scale->gradeFor(85)?->grade);
        $this->assertSame('F', $scale->gradeFor(12)?->grade);
    }

    public function test_teacher_enters_marks_and_result_card_is_computed(): void
    {
        $this->api($this->admin)->postJson('/api/v1/grade-scales', [
            'name' => 'Default Scale', 'code' => 'DEF', 'is_default' => true,
            'items' => [
                ['grade' => 'A', 'min_percentage' => 80, 'max_percentage' => 100, 'points' => 4],
                ['grade' => 'B', 'min_percentage' => 60, 'max_percentage' => 79.99, 'points' => 3],
                ['grade' => 'F', 'min_percentage' => 0, 'max_percentage' => 59.99, 'points' => 0],
            ],
        ])->assertStatus(201);

        $paper = $this->api($this->admin)->postJson('/api/v1/exam-papers', [
            'exam_id' => $this->exam->id,
            'class_room_id' => $this->class->id,
            'subject_id' => $this->subject->id,
            'exam_date' => '2026-09-02',
            'max_marks' => 100,
            'pass_marks' => 40,
        ])->assertStatus(201)->json('data');

        $this->api($this->teacher)->postJson('/api/v1/exam-marks/bulk', [
            'exam_paper_id' => $paper['id'],
            'marks' => [
                ['student_id' => $this->ali->id, 'marks_obtained' => 90],
                ['student_id' => $this->sara->id, 'marks_obtained' => 55],
            ],
        ])->assertOk()->assertJsonCount(2, 'data');

        $card = $this->api($this->admin)
            ->getJson("/api/v1/exams/{$this->exam->id}/students/{$this->ali->id}/result-card")
            ->assertOk()
            ->json('data');

        $this->assertSame('A', $card['grade']);
        $this->assertSame(90.0, (float) $card['total_obtained']);
        $this->assertSame('pass', $card['result']);
    }

    public function test_marks_above_paper_maximum_are_rejected(): void
    {
        $paper = $this->api($this->admin)->postJson('/api/v1/exam-papers', [
            'exam_id' => $this->exam->id,
            'class_room_id' => $this->class->id,
            'subject_id' => $this->subject->id,
            'exam_date' => '2026-09-02',
            'max_marks' => 50,
            'pass_marks' => 20,
        ])->assertStatus(201)->json('data');

        $this->api($this->teacher)->postJson('/api/v1/exam-marks/bulk', [
            'exam_paper_id' => $paper['id'],
            'marks' => [
                ['student_id' => $this->ali->id, 'marks_obtained' => 70],
            ],
        ])->assertStatus(422)->assertJsonValidationErrors('marks');
    }

    public function test_merit_list_ranks_students(): void
    {
        $paper = $this->api($this->admin)->postJson('/api/v1/exam-papers', [
            'exam_id' => $this->exam->id,
            'class_room_id' => $this->class->id,
            'subject_id' => $this->subject->id,
            'exam_date' => '2026-09-02',
            'max_marks' => 100, 'pass_marks' => 40,
        ])->assertStatus(201)->json('data');

        $this->api($this->teacher)->postJson('/api/v1/exam-marks/bulk', [
            'exam_paper_id' => $paper['id'],
            'marks' => [
                ['student_id' => $this->ali->id, 'marks_obtained' => 70],
                ['student_id' => $this->sara->id, 'marks_obtained' => 95],
            ],
        ])->assertOk();

        $rows = $this->api($this->admin)
            ->getJson("/api/v1/exams/{$this->exam->id}/merit-list?class_room_id={$this->class->id}")
            ->assertOk()
            ->json('data');

        $this->assertSame($this->sara->id, $rows[0]['student_id']);
        $this->assertSame(1, $rows[0]['rank']);
        $this->assertSame(2, $rows[1]['rank']);
    }

    public function test_publish_requires_approval_permission(): void
    {
        $this->api($this->teacher)
            ->postJson("/api/v1/exams/{$this->exam->id}/publish")
            ->assertStatus(403);

        $this->api($this->admin)
            ->postJson("/api/v1/exams/{$this->exam->id}/publish")
            ->assertOk()
            ->assertJsonPath('data.status', ExamStatus::Published->value);
    }

    public function test_invigilation_duplicate_assignment_is_rejected(): void
    {
        $paper = $this->api($this->admin)->postJson('/api/v1/exam-papers', [
            'exam_id' => $this->exam->id,
            'class_room_id' => $this->class->id,
            'subject_id' => $this->subject->id,
            'exam_date' => '2026-09-02',
        ])->assertStatus(201)->json('data');

        $this->api($this->admin)->postJson('/api/v1/invigilation-duties', [
            'exam_paper_id' => $paper['id'],
            'user_id' => $this->teacher->id,
            'role' => InvigilationRole::Chief->value,
        ])->assertStatus(201);

        $this->api($this->admin)->postJson('/api/v1/invigilation-duties', [
            'exam_paper_id' => $paper['id'],
            'user_id' => $this->teacher->id,
        ])->assertStatus(422);
    }

    public function test_result_analysis_reports_class_subject_teacher_and_year_on_year(): void
    {
        $this->createDefaultScale();

        $paper = $this->api($this->admin)->postJson('/api/v1/exam-papers', [
            'exam_id' => $this->exam->id,
            'class_room_id' => $this->class->id,
            'subject_id' => $this->subject->id,
            'exam_date' => '2026-09-02',
            'max_marks' => 100, 'pass_marks' => 40,
        ])->assertStatus(201)->json('data');

        $this->api($this->teacher)->postJson('/api/v1/exam-marks/bulk', [
            'exam_paper_id' => $paper['id'],
            'marks' => [
                ['student_id' => $this->ali->id, 'marks_obtained' => 90],
                ['student_id' => $this->sara->id, 'marks_obtained' => 55],
            ],
        ])->assertOk();

        TeachingAssignment::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'academic_year_id' => $this->year->id,
            'teacher_user_id' => $this->teacher->id,
            'subject_id' => $this->subject->id,
            'class_room_id' => $this->class->id,
            'is_active' => true,
        ]);

        $classAnalysis = $this->api($this->admin)
            ->getJson("/api/v1/exams/{$this->exam->id}/analysis/class?class_room_id={$this->class->id}")
            ->assertOk()
            ->json('data');

        $this->assertSame(72.5, (float) $classAnalysis['average_percentage']);
        $this->assertSame(1, $classAnalysis['grade_distribution']['A']);
        $this->assertSame(2, $classAnalysis['subjects'][0]['passed']);

        $subject = $this->api($this->admin)
            ->getJson("/api/v1/exams/{$this->exam->id}/analysis/subject?subject_id={$this->subject->id}")
            ->assertOk()
            ->json('data');
        $this->assertSame(2, $subject['classes'][0]['appeared']);

        $teachers = $this->api($this->admin)
            ->getJson("/api/v1/exams/{$this->exam->id}/analysis/teachers")
            ->assertOk()
            ->json('data');
        $this->assertSame($this->teacher->id, $teachers[0]['teacher_id']);
        $this->assertSame(100.0, (float) $teachers[0]['pass_rate']);

        $yearOnYear = $this->api($this->admin)
            ->getJson('/api/v1/exams/analysis/year-on-year?exam_type_id='.$this->examType->id)
            ->assertOk()
            ->json('data');
        $this->assertCount(1, $yearOnYear);
        $this->assertSame(72.5, (float) $yearOnYear[0]['average_percentage']);
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
