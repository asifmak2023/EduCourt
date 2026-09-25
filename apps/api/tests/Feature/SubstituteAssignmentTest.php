<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Enums\SubstituteStatus;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ClassRoom;
use App\Models\Institution;
use App\Models\Period;
use App\Models\Section;
use App\Models\Stage;
use App\Models\Subject;
use App\Models\SubstituteAssignment;
use App\Models\TimetableSlot;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubstituteAssignmentTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private User $teacherA;

    private User $teacherB;

    private User $teacherC;

    private AcademicYear $year;

    private ClassRoom $class;

    private Section $section;

    private Period $period;

    private TimetableSlot $slot;

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
        $this->teacherA = $this->actor(RoleName::Teacher);
        $this->teacherB = $this->actor(RoleName::Teacher);
        $this->teacherC = $this->actor(RoleName::Teacher);

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

        $this->section = Section::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'class_room_id' => $this->class->id, 'name' => 'A',
        ]);

        $this->period = Period::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Period 1', 'sequence' => 1,
            'starts_at' => '08:00', 'ends_at' => '08:45',
            'is_break' => false, 'is_active' => true,
        ]);

        $subject = Subject::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Mathematics', 'code' => 'MATH', 'is_active' => true,
        ]);

        $this->slot = TimetableSlot::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'section_id' => $this->section->id,
            'period_id' => $this->period->id,
            'day_of_week' => 1,
            'subject_id' => $subject->id,
            'teacher_user_id' => $this->teacherA->id,
            'is_published' => true,
        ]);
    }

    public function test_substitute_can_be_scheduled_for_a_matching_weekday(): void
    {
        $this->as($this->admin)->postJson('/api/v1/substitute-assignments', [
            'timetable_slot_id' => $this->slot->id,
            'substitute_user_id' => $this->teacherB->id,
            'date' => '2026-09-21',
            'reason' => 'Original teacher on leave',
        ])->assertStatus(201)
            ->assertJsonPath('data.status', SubstituteStatus::Scheduled->value)
            ->assertJsonPath('data.substitute.id', $this->teacherB->id)
            ->assertJsonPath('data.slot.class_room', 'Class 1');

        $this->assertDatabaseHas('substitute_assignments', [
            'timetable_slot_id' => $this->slot->id,
            'substitute_user_id' => $this->teacherB->id,
            'status' => 'scheduled',
        ]);
    }

    public function test_date_must_fall_on_the_slot_weekday(): void
    {
        $this->as($this->admin)->postJson('/api/v1/substitute-assignments', [
            'timetable_slot_id' => $this->slot->id,
            'substitute_user_id' => $this->teacherB->id,
            'date' => '2026-09-22',
        ])->assertStatus(422)->assertJsonValidationErrors('date');
    }

    public function test_substitute_cannot_be_the_slot_teacher(): void
    {
        $this->as($this->admin)->postJson('/api/v1/substitute-assignments', [
            'timetable_slot_id' => $this->slot->id,
            'substitute_user_id' => $this->teacherA->id,
            'date' => '2026-09-21',
        ])->assertStatus(422)->assertJsonValidationErrors('substitute_user_id');
    }

    public function test_substitute_cannot_be_double_booked_in_the_same_period(): void
    {
        $subject = Subject::query()->where('code', 'MATH')->firstOrFail();

        $otherClass = ClassRoom::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'stage_id' => $this->class->stage_id, 'name' => 'Class 2', 'code' => 'C2',
        ]);

        $otherSlot = TimetableSlot::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $otherClass->id,
            'period_id' => $this->period->id,
            'day_of_week' => 1,
            'subject_id' => $subject->id,
            'teacher_user_id' => $this->teacherC->id,
            'is_published' => true,
        ]);

        $this->as($this->admin)->postJson('/api/v1/substitute-assignments', [
            'timetable_slot_id' => $this->slot->id,
            'substitute_user_id' => $this->teacherB->id,
            'date' => '2026-09-21',
        ])->assertStatus(201);

        $this->as($this->admin)->postJson('/api/v1/substitute-assignments', [
            'timetable_slot_id' => $otherSlot->id,
            'substitute_user_id' => $this->teacherB->id,
            'date' => '2026-09-21',
        ])->assertStatus(422)->assertJsonValidationErrors('substitute_user_id');
    }

    public function test_assignment_can_be_cancelled_once(): void
    {
        $id = $this->as($this->admin)->postJson('/api/v1/substitute-assignments', [
            'timetable_slot_id' => $this->slot->id,
            'substitute_user_id' => $this->teacherB->id,
            'date' => '2026-09-21',
        ])->assertStatus(201)->json('data.id');

        $this->as($this->admin)->postJson("/api/v1/substitute-assignments/{$id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', SubstituteStatus::Cancelled->value);

        $this->as($this->admin)->postJson("/api/v1/substitute-assignments/{$id}/cancel")
            ->assertStatus(422)->assertJsonValidationErrors('status');

        $this->assertSame(SubstituteStatus::Cancelled, SubstituteAssignment::query()->findOrFail($id)->status);
    }

    public function test_assignments_can_be_filtered_by_date(): void
    {
        $this->as($this->admin)->postJson('/api/v1/substitute-assignments', [
            'timetable_slot_id' => $this->slot->id,
            'substitute_user_id' => $this->teacherB->id,
            'date' => '2026-09-21',
        ])->assertStatus(201);

        $this->as($this->admin)->getJson('/api/v1/substitute-assignments?date=2026-09-21')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->as($this->admin)->getJson('/api/v1/substitute-assignments?date=2026-09-28')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_teacher_cannot_create_substitute_assignments(): void
    {
        $this->as($this->teacherA)->postJson('/api/v1/substitute-assignments', [
            'timetable_slot_id' => $this->slot->id,
            'substitute_user_id' => $this->teacherB->id,
            'date' => '2026-09-21',
        ])->assertStatus(403);
    }

    private function as(User $user): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('t')->plainTextToken);
    }

    private function actor(RoleName $role): User
    {
        $user = User::factory()->create([
            'institution_id' => $this->campus->institution_id,
            'campus_id' => $this->campus->id,
        ]);
        $user->syncRoles([$role->value]);

        return $user;
    }
}
