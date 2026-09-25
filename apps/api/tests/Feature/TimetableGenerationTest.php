<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ClassRoom;
use App\Models\ClassSubject;
use App\Models\Institution;
use App\Models\Period;
use App\Models\Section;
use App\Models\Stage;
use App\Models\Subject;
use App\Models\TeachingAssignment;
use App\Models\TimetableSlot;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TimetableGenerationTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private User $teacherOne;

    private User $teacherTwo;

    private AcademicYear $year;

    private ClassRoom $classOne;

    private Section $sectionOne;

    private ClassRoom $classTwo;

    private Section $sectionTwo;

    private Subject $math;

    private Subject $english;

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
        $this->teacherOne = $this->actor(RoleName::Teacher);
        $this->teacherTwo = $this->actor(RoleName::Teacher);

        $this->year = AcademicYear::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => '2026-2027', 'code' => 'AY',
            'starts_on' => '2026-04-01', 'ends_on' => '2027-03-31', 'status' => 'active',
        ]);

        [$this->classOne, $this->sectionOne] = $this->classWithSection('C1');
        [$this->classTwo, $this->sectionTwo] = $this->classWithSection('C2');

        $this->math = $this->subject('MATH');
        $this->english = $this->subject('ENG');

        $this->map($this->classOne, $this->math);
        $this->map($this->classOne, $this->english);
        $this->map($this->classTwo, $this->math);

        $this->assign($this->classOne, $this->sectionOne, $this->math, $this->teacherOne, 2);
        $this->assign($this->classOne, $this->sectionOne, $this->english, $this->teacherTwo, 1);

        $this->period(1, '08:00', '08:45');
        $this->period(2, '08:45', '09:30');
        $this->periodBreak(3, '09:30', '10:00');
        $this->period(4, '10:00', '10:45');
    }

    public function test_dry_run_plans_without_persisting(): void
    {
        $this->as($this->admin)->postJson('/api/v1/timetable/generate', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->classOne->id,
            'days' => [1, 2, 3],
            'dry_run' => true,
        ])
            ->assertOk()
            ->assertJsonPath('data.dry_run', true)
            ->assertJsonPath('data.created', 3)
            ->assertJsonPath('data.classes.0.required', 3)
            ->assertJsonPath('data.classes.0.placed', 3)
            ->assertJsonPath('data.classes.0.unplaced', []);

        $this->assertSame(0, TimetableSlot::query()->count());
    }

    public function test_generation_creates_draft_slots_for_all_assignments(): void
    {
        $this->as($this->admin)->postJson('/api/v1/timetable/generate', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->classOne->id,
            'days' => [1, 2, 3],
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.created', 3)
            ->assertJsonCount(3, 'data.slots');

        $this->assertSame(3, TimetableSlot::query()->count());
        $this->assertSame(0, TimetableSlot::query()->where('is_published', true)->count());

        $this->assertDatabaseCount('timetable_slots', 3);
        $this->assertSame(2, TimetableSlot::query()->where('subject_id', $this->math->id)->count());
        $this->assertSame(1, TimetableSlot::query()->where('subject_id', $this->english->id)->count());

        $this->assertSame(
            3,
            TimetableSlot::query()->where('class_room_id', $this->classOne->id)
                ->get()
                ->map(fn ($s) => $s->day_of_week.'-'.$s->period_id)
                ->unique()
                ->count()
        );
    }

    public function test_teacher_is_never_double_booked_across_classes(): void
    {
        $this->assign($this->classTwo, $this->sectionTwo, $this->math, $this->teacherOne, 3);

        $this->as($this->admin)->postJson('/api/v1/timetable/generate', [
            'academic_year_id' => $this->year->id,
            'days' => [1, 2, 3],
        ])->assertStatus(201);

        $teacherSlots = TimetableSlot::query()->where('teacher_user_id', $this->teacherOne->id)->get();

        $this->assertSame(
            $teacherSlots->count(),
            $teacherSlots->map(fn ($s) => $s->day_of_week.'-'.$s->period_id)->unique()->count()
        );

        $this->assertGreaterThanOrEqual(1, $teacherSlots->count());
    }

    public function test_replace_clears_existing_slots_before_generating(): void
    {
        $this->as($this->admin)->postJson('/api/v1/timetable/generate', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->classOne->id,
            'days' => [1, 2, 3],
        ])->assertStatus(201);

        $this->as($this->admin)->postJson('/api/v1/timetable/generate', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->classOne->id,
            'days' => [1, 2, 3],
            'replace' => true,
        ])->assertStatus(201)->assertJsonPath('data.removed', 3)->assertJsonPath('data.created', 3);

        $this->assertSame(3, TimetableSlot::query()->count());
    }

    public function test_clear_removes_unpublished_slots_only(): void
    {
        $this->as($this->admin)->postJson('/api/v1/timetable/generate', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->classOne->id,
            'days' => [1, 2, 3],
        ])->assertStatus(201);

        TimetableSlot::query()->first()->update(['is_published' => true]);

        $this->as($this->admin)->deleteJson('/api/v1/timetable/generate', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->classOne->id,
        ])->assertOk()->assertJsonPath('removed', 2);

        $this->assertSame(1, TimetableSlot::query()->count());
        $this->assertSame(1, TimetableSlot::query()->where('is_published', true)->count());
    }

    public function test_teacher_cannot_generate_a_timetable(): void
    {
        $this->as($this->teacherOne)->postJson('/api/v1/timetable/generate', [
            'academic_year_id' => $this->year->id,
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

    private function classWithSection(string $code): array
    {
        $stage = Stage::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Primary', 'code' => "PRI-{$code}", 'sequence' => 1,
        ]);

        $class = ClassRoom::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'stage_id' => $stage->id, 'name' => $code, 'code' => $code,
        ]);

        $section = Section::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'class_room_id' => $class->id, 'name' => 'A',
        ]);

        return [$class, $section];
    }

    private function subject(string $code): Subject
    {
        return Subject::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => $code, 'code' => $code, 'type' => 'core',
        ]);
    }

    private function map(ClassRoom $class, Subject $subject): void
    {
        ClassSubject::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $class->id,
            'subject_id' => $subject->id,
        ]);
    }

    private function assign(ClassRoom $class, Section $section, Subject $subject, ?User $teacher, int $weekly): void
    {
        TeachingAssignment::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'academic_year_id' => $this->year->id,
            'teacher_user_id' => $teacher?->id,
            'subject_id' => $subject->id,
            'class_room_id' => $class->id,
            'section_id' => $section->id,
            'weekly_periods' => $weekly,
        ]);
    }

    private function period(int $sequence, string $startsAt, string $endsAt): Period
    {
        return Period::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => "Period {$sequence}", 'sequence' => $sequence,
            'starts_at' => $startsAt, 'ends_at' => $endsAt,
        ]);
    }

    private function periodBreak(int $sequence, string $startsAt, string $endsAt): Period
    {
        return Period::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => "Break {$sequence}", 'sequence' => $sequence,
            'starts_at' => $startsAt, 'ends_at' => $endsAt, 'is_break' => true,
        ]);
    }
}
