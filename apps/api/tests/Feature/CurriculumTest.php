<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\LessonPlanStatus;
use App\Enums\RoleName;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ClassRoom;
use App\Models\Institution;
use App\Models\Stage;
use App\Models\Subject;
use App\Models\TeachingAssignment;
use App\Models\Term;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CurriculumTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private User $teacher;

    private AcademicYear $year;

    private ClassRoom $class;

    private Subject $subject;

    private Term $term;

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
            'starts_on' => '2026-04-01', 'ends_on' => '2027-03-31',
            'status' => 'active', 'is_current' => true,
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

        $this->subject = Subject::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Mathematics', 'code' => 'MATH', 'type' => 'core',
        ]);

        $this->term = Term::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'academic_year_id' => $this->year->id,
            'name' => 'Term 1', 'sequence' => 1,
            'starts_on' => '2026-04-01', 'ends_on' => '2026-08-31',
            'is_current' => true,
        ]);

        TeachingAssignment::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'academic_year_id' => $this->year->id,
            'teacher_user_id' => $this->teacher->id,
            'subject_id' => $this->subject->id,
            'class_room_id' => $this->class->id,
            'is_active' => true,
        ]);
    }

    public function test_syllabus_units_can_be_created_and_listed_by_subject(): void
    {
        $unit = $this->api($this->admin)->postJson('/api/v1/syllabus-units', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'subject_id' => $this->subject->id,
            'term_id' => $this->term->id,
            'title' => 'Numbers up to 100',
            'sequence' => 1,
            'estimated_periods' => 6,
        ])->assertStatus(201)->json('data');

        $list = $this->api($this->admin)
            ->getJson('/api/v1/syllabus-units?subject_id='.$this->subject->id)
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->assertSame($unit['id'], $list->json('data.0.id'));
    }

    public function test_class_book_list_can_be_created(): void
    {
        $this->api($this->admin)->postJson('/api/v1/class-books', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'subject_id' => $this->subject->id,
            'title' => 'New Countdown 1',
            'author' => 'A. Author',
            'publisher' => 'OUP',
            'isbn' => '978-0-19-000000-0',
            'price' => 1200,
            'is_required' => true,
        ])->assertStatus(201)->assertJsonPath('data.title', 'New Countdown 1');
    }

    public function test_teacher_can_create_a_lesson_plan_and_admin_approves_it(): void
    {
        $plan = $this->api($this->teacher)->postJson('/api/v1/lesson-plans', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'subject_id' => $this->subject->id,
            'title' => 'Place value',
            'objectives' => 'Identify tens and ones.',
            'planned_from' => '2026-04-10',
            'planned_to' => '2026-04-14',
        ])->assertStatus(201)
            ->assertJsonPath('data.status', LessonPlanStatus::Draft->value)
            ->assertJsonPath('data.created_by', $this->teacher->id)
            ->json('data');

        $this->api($this->teacher)
            ->postJson("/api/v1/lesson-plans/{$plan['id']}/approve")
            ->assertStatus(403);

        $this->api($this->admin)
            ->postJson("/api/v1/lesson-plans/{$plan['id']}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', LessonPlanStatus::Approved->value)
            ->assertJsonPath('data.approved_by', $this->admin->id);
    }

    public function test_lesson_plan_requires_campus_scoped_references(): void
    {
        $other = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus B', 'code' => 'B', 'type' => CampusType::School->value,
        ]);
        $foreignSubject = Subject::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $other->id,
            'name' => 'Science', 'code' => 'SCI', 'type' => 'core',
        ]);

        $this->api($this->admin)->postJson('/api/v1/lesson-plans', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'subject_id' => $foreignSubject->id,
            'title' => 'Cross-campus attempt',
        ])->assertStatus(422)->assertJsonValidationErrors('subject_id');
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
