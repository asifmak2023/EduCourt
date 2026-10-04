<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\ExamStatus;
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
use App\Models\Term;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CreditModelTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private AcademicYear $year;

    private Term $termOne;

    private Term $termTwo;

    private ClassRoom $class;

    private Subject $math;

    private Subject $english;

    private Student $ali;

    private int $mathPaperTermOne;

    private int $englishPaperTermOne;

    private int $mathPaperTermTwo;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->institution = Institution::create(['name' => 'Test University', 'code' => 'TU']);
        $this->campus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Main Campus', 'code' => 'MAIN', 'type' => CampusType::College->value,
            'academic_model' => 'university', 'term_system' => 'semesters',
            'grading_system' => 'gpa', 'credit_hours_enabled' => true,
        ]);

        $this->admin = $this->actor(RoleName::CampusAdmin);

        $this->year = AcademicYear::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => '2026-2027', 'code' => 'AY',
            'starts_on' => '2026-04-01', 'ends_on' => '2027-03-31', 'status' => 'active',
        ]);

        $this->termOne = Term::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'academic_year_id' => $this->year->id,
            'name' => 'Semester 1', 'sequence' => 1,
            'starts_on' => '2026-04-01', 'ends_on' => '2026-08-31', 'is_current' => true,
        ]);

        $this->termTwo = Term::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'academic_year_id' => $this->year->id,
            'name' => 'Semester 2', 'sequence' => 2,
            'starts_on' => '2026-09-01', 'ends_on' => '2027-03-31', 'is_current' => false,
        ]);

        $stage = Stage::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Undergraduate', 'code' => 'UG', 'sequence' => 1,
        ]);

        $this->class = ClassRoom::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'stage_id' => $stage->id, 'name' => 'BSc Year 1', 'code' => 'BSC1',
        ]);

        $section = Section::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'class_room_id' => $this->class->id, 'name' => 'A',
        ]);

        $this->math = Subject::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Mathematics', 'code' => 'MATH', 'type' => 'core', 'credit_hours' => 3,
        ]);

        $this->english = Subject::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'English', 'code' => 'ENG', 'type' => 'core', 'credit_hours' => 1,
        ]);

        $this->ali = $this->student('ADM-1', 'Ali', 'Raza', $section);

        $this->createDefaultScale();

        $examType = ExamType::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Semester', 'code' => 'SEM', 'weightage' => 100,
        ]);

        $this->mathPaperTermOne = $this->paper($examType, $this->termOne, $this->math);
        $this->englishPaperTermOne = $this->paper($examType, $this->termOne, $this->english);
        $this->mathPaperTermTwo = $this->paper($examType, $this->termTwo, $this->math);
    }

    public function test_courses_can_be_registered_with_credit_hours_and_dropped(): void
    {
        $math = $this->api($this->admin)->postJson('/api/v1/course-registrations', [
            'student_id' => $this->ali->id,
            'term_id' => $this->termOne->id,
            'subject_id' => $this->math->id,
            'class_room_id' => $this->class->id,
            'credit_hours' => 4,
        ])->assertStatus(201)
            ->assertJsonPath('data.credit_hours', 4)
            ->assertJsonPath('data.status', 'registered')
            ->json('data');

        $english = $this->api($this->admin)->postJson('/api/v1/course-registrations', [
            'student_id' => $this->ali->id,
            'term_id' => $this->termOne->id,
            'subject_id' => $this->english->id,
        ])->assertStatus(201)
            ->assertJsonPath('data.credit_hours', 1)
            ->json('data');

        $this->api($this->admin)->postJson('/api/v1/course-registrations', [
            'student_id' => $this->ali->id,
            'term_id' => $this->termOne->id,
            'subject_id' => $this->math->id,
        ])->assertStatus(422);

        $this->api($this->admin)
            ->postJson("/api/v1/course-registrations/{$english['id']}/drop")
            ->assertOk()
            ->assertJsonPath('data.status', 'dropped');

        $this->api($this->admin)
            ->getJson('/api/v1/course-registrations?student_id='.$this->ali->id.'&term_id='.$this->termOne->id)
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->assertSame(4.0, (float) $math['credit_hours']);
    }

    public function test_term_gpa_is_credit_weighted(): void
    {
        $this->register($this->termOne, $this->math, 3);
        $this->register($this->termOne, $this->english, 1);

        $this->enterMarks($this->mathPaperTermOne, 90);
        $this->enterMarks($this->englishPaperTermOne, 70);

        $gpa = $this->api($this->admin)
            ->getJson("/api/v1/students/{$this->ali->id}/term-gpa?term_id={$this->termOne->id}")
            ->assertOk()
            ->json('data');

        $this->assertSame(3.75, $gpa['gpa']);
        $this->assertSame(4.0, (float) $gpa['credits_graded']);
        $this->assertSame(4.0, (float) $gpa['credits_earned']);

        $subjects = collect($gpa['subjects'])->keyBy('subject_id');
        $this->assertSame('A', $subjects[$this->math->id]['grade']);
        $this->assertSame('B', $subjects[$this->english->id]['grade']);
    }

    public function test_transcript_builds_cumulative_gpa(): void
    {
        $this->register($this->termOne, $this->math, 3);
        $this->register($this->termOne, $this->english, 1);
        $this->enterMarks($this->mathPaperTermOne, 90);
        $this->enterMarks($this->englishPaperTermOne, 70);

        $this->register($this->termTwo, $this->math, 3);
        $this->enterMarks($this->mathPaperTermTwo, 60);

        $transcript = $this->api($this->admin)
            ->getJson("/api/v1/students/{$this->ali->id}/transcript")
            ->assertOk()
            ->json('data');

        $this->assertCount(2, $transcript['terms']);
        $this->assertSame(3.75, (float) $transcript['terms'][0]['gpa']);
        $this->assertSame(3.0, (float) $transcript['terms'][1]['gpa']);
        $this->assertSame(3.43, (float) $transcript['gpa']);
        $this->assertSame(7.0, (float) $transcript['credits_earned']);
    }

    public function test_a_student_cannot_reach_staff_credit_endpoints(): void
    {
        $this->register($this->termOne, $this->math, 3);
        $this->enterMarks($this->mathPaperTermOne, 90);

        $studentUser = $this->actor(RoleName::Student);

        $this->api($studentUser)
            ->getJson("/api/v1/students/{$this->ali->id}/transcript")
            ->assertForbidden();

        $this->api($studentUser)->postJson('/api/v1/course-registrations', [
            'student_id' => $this->ali->id,
            'term_id' => $this->termTwo->id,
            'subject_id' => $this->english->id,
        ])->assertStatus(403);
    }

    private function register(Term $term, Subject $subject, float $credits): void
    {
        $this->api($this->admin)->postJson('/api/v1/course-registrations', [
            'student_id' => $this->ali->id,
            'term_id' => $term->id,
            'subject_id' => $subject->id,
            'credit_hours' => $credits,
        ])->assertStatus(201);
    }

    private function enterMarks(int $paperId, float $marks): void
    {
        $this->api($this->admin)->postJson('/api/v1/exam-marks/bulk', [
            'exam_paper_id' => $paperId,
            'marks' => [['student_id' => $this->ali->id, 'marks_obtained' => $marks]],
        ])->assertOk();
    }

    private function paper(ExamType $examType, Term $term, Subject $subject): int
    {
        $exam = Exam::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'academic_year_id' => $this->year->id,
            'term_id' => $term->id,
            'exam_type_id' => $examType->id,
            'name' => $term->name.' '.$subject->code,
            'starts_on' => $term->starts_on, 'ends_on' => $term->ends_on,
            'status' => ExamStatus::Scheduled->value,
        ]);

        return (int) $this->api($this->admin)->postJson('/api/v1/exam-papers', [
            'exam_id' => $exam->id,
            'class_room_id' => $this->class->id,
            'subject_id' => $subject->id,
            'exam_date' => $term->starts_on->toDateString(),
            'max_marks' => 100,
            'pass_marks' => 40,
        ])->assertStatus(201)->json('data.id');
    }

    private function createDefaultScale(): void
    {
        $this->api($this->admin)->postJson('/api/v1/grade-scales', [
            'name' => 'GPA Scale', 'code' => 'GPA', 'is_default' => true,
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
