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
use App\Models\Room;
use App\Models\Section;
use App\Models\Stage;
use App\Models\Subject;
use App\Models\TeachingAssignment;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class TimetableTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private AcademicYear $year;

    private ClassRoom $classOne;

    private Section $sectionOne;

    private ClassRoom $classTwo;

    private Section $sectionTwo;

    private Subject $math;

    private Subject $english;

    private User $teacherOne;

    private User $teacherTwo;

    private Period $periodOne;

    private Period $periodTwo;

    private Room $roomOne;

    private Room $roomTwo;

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
        $this->map($this->classTwo, $this->math);
        $this->map($this->classOne, $this->english);

        $this->assign($this->classOne, $this->sectionOne, $this->math, $this->teacherOne);
        $this->assign($this->classTwo, $this->sectionTwo, $this->math, $this->teacherOne);
        $this->assign($this->classTwo, $this->sectionTwo, $this->math, $this->teacherTwo);

        $this->periodOne = $this->period(1, '08:00', '08:45');
        $this->periodTwo = $this->period(2, '08:45', '09:30');
        $this->roomOne = $this->room('R1');
        $this->roomTwo = $this->room('R2');
    }

    public function test_period_and_room_can_be_created(): void
    {
        $this->apiPost('/api/v1/periods', [
            'name' => 'Period 3', 'sequence' => 3, 'starts_at' => '09:30', 'ends_at' => '10:15',
        ])->assertStatus(201);

        $this->apiPost('/api/v1/rooms', [
            'name' => 'Room 103', 'code' => 'R103', 'type' => 'classroom', 'capacity' => 40,
        ])->assertStatus(201)->assertJsonPath('data.code', 'R103');
    }

    public function test_slot_can_be_created_for_a_mapped_and_assigned_subject(): void
    {
        $this->apiPost('/api/v1/timetable-slots', $this->slot([
            'teacher_user_id' => $this->teacherOne->id,
        ]))->assertStatus(201)->assertJsonPath('data.day_of_week', 1);
    }

    public function test_class_slot_conflict_is_rejected(): void
    {
        $this->apiPost('/api/v1/timetable-slots', $this->slot([
            'teacher_user_id' => $this->teacherOne->id,
        ]))->assertStatus(201);

        $this->apiPost('/api/v1/timetable-slots', $this->slot([
            'room_id' => $this->roomTwo->id,
        ]))->assertStatus(409);
    }

    public function test_teacher_double_booking_is_rejected(): void
    {
        $this->apiPost('/api/v1/timetable-slots', $this->slot([
            'teacher_user_id' => $this->teacherOne->id,
        ]))->assertStatus(201);

        $this->apiPost('/api/v1/timetable-slots', $this->slot([
            'class_room_id' => $this->classTwo->id,
            'section_id' => $this->sectionTwo->id,
            'teacher_user_id' => $this->teacherOne->id,
            'room_id' => $this->roomTwo->id,
        ]))->assertStatus(409);
    }

    public function test_room_double_booking_is_rejected(): void
    {
        $this->apiPost('/api/v1/timetable-slots', $this->slot([
            'teacher_user_id' => $this->teacherOne->id,
        ]))->assertStatus(201);

        $this->apiPost('/api/v1/timetable-slots', $this->slot([
            'class_room_id' => $this->classTwo->id,
            'section_id' => $this->sectionTwo->id,
            'teacher_user_id' => $this->teacherTwo->id,
            'room_id' => $this->roomOne->id,
        ]))->assertStatus(409);
    }

    public function test_slot_requires_a_subject_mapped_to_the_class(): void
    {
        $unmapped = $this->subject('SCI');

        $this->apiPost('/api/v1/timetable-slots', $this->slot([
            'subject_id' => $unmapped->id,
            'teacher_user_id' => $this->teacherOne->id,
        ]))->assertStatus(422)->assertJsonValidationErrors('subject_id');
    }

    public function test_publish_controls_visibility_for_teachers(): void
    {
        $payload = $this->slot(['teacher_user_id' => $this->teacherOne->id, 'is_published' => false]);
        $this->as($this->admin)
            ->postJson('/api/v1/timetable-slots', $payload)
            ->assertStatus(201);

        $url = "/api/v1/timetable/classes/{$this->classOne->id}?academic_year_id={$this->year->id}";

        $this->as($this->teacherOne)
            ->getJson($url)->assertOk()->assertJsonCount(0, 'data');

        $this->as($this->admin)
            ->getJson($url)->assertOk()->assertJsonCount(1, 'data');

        $this->as($this->admin)
            ->postJson('/api/v1/timetable-slots/publish', [
                'academic_year_id' => $this->year->id,
                'class_room_id' => $this->classOne->id,
            ])->assertOk();

        $this->as($this->teacherOne)
            ->getJson($url)->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_teacher_cannot_manage_the_timetable(): void
    {
        $this->as($this->teacherOne)
            ->postJson('/api/v1/timetable-slots', $this->slot([
                'teacher_user_id' => $this->teacherOne->id,
            ]))
            ->assertStatus(403);
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

    private function assign(ClassRoom $class, Section $section, Subject $subject, User $teacher): void
    {
        TeachingAssignment::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'academic_year_id' => $this->year->id,
            'teacher_user_id' => $teacher->id,
            'subject_id' => $subject->id,
            'class_room_id' => $class->id,
            'section_id' => $section->id,
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

    private function room(string $code): Room
    {
        return Room::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => $code, 'code' => $code, 'type' => 'classroom',
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function slot(array $overrides = []): array
    {
        return array_merge([
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->classOne->id,
            'section_id' => $this->sectionOne->id,
            'period_id' => $this->periodOne->id,
            'day_of_week' => 1,
            'subject_id' => $this->math->id,
            'room_id' => $this->roomOne->id,
        ], $overrides);
    }

    private function apiPost(string $uri, array $payload): TestResponse
    {
        return $this->as($this->admin)->postJson($uri, $payload);
    }
}
