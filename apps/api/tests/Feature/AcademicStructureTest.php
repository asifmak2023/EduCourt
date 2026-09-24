<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ClassRoom;
use App\Models\ClassSubject;
use App\Models\Institution;
use App\Models\Stage;
use App\Models\Subject;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class AcademicStructureTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campusA;

    private Campus $campusB;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->institution = Institution::create(['name' => 'Test Trust', 'code' => 'TT']);

        $this->campusA = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus A', 'code' => 'A', 'type' => CampusType::School->value,
        ]);

        $this->campusB = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus B', 'code' => 'B', 'type' => CampusType::School->value,
        ]);

        $this->admin = $this->actor($this->campusA, RoleName::CampusAdmin);
    }

    public function test_campus_admin_only_sees_academic_years_from_their_campus(): void
    {
        $mine = $this->year($this->campusA, '2026-2027', 'AY-A');
        $this->year($this->campusB, '2026-2027', 'AY-B');

        $ids = collect($this->apiGet('/api/v1/academic-years')->assertOk()->json('data'))->pluck('id');

        $this->assertTrue($ids->contains($mine->id));
        $this->assertCount(1, $ids);
    }

    public function test_cross_campus_reference_is_rejected(): void
    {
        $foreignStage = Stage::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campusB->id,
            'name' => 'Primary', 'code' => 'PRI', 'sequence' => 1,
        ]);

        $this->apiPost('/api/v1/classes', [
            'stage_id' => $foreignStage->id,
            'name' => 'Class 1',
            'code' => 'C1',
        ])->assertStatus(422)->assertJsonValidationErrors('stage_id');
    }

    public function test_academic_year_and_term_can_be_created(): void
    {
        $year = $this->apiPost('/api/v1/academic-years', [
            'name' => '2026-2027',
            'code' => 'AY-2026',
            'starts_on' => '2026-04-01',
            'ends_on' => '2027-03-31',
            'status' => 'active',
            'is_current' => true,
        ])->assertStatus(201)->json('data');

        $this->apiPost('/api/v1/terms', [
            'academic_year_id' => $year['id'],
            'name' => 'Term 1',
            'sequence' => 1,
            'starts_on' => '2026-04-01',
            'ends_on' => '2026-08-31',
            'is_current' => true,
        ])->assertStatus(201)->assertJsonPath('data.name', 'Term 1');
    }

    public function test_term_dates_must_fall_within_the_academic_year(): void
    {
        $year = $this->year($this->campusA, '2026-2027', 'AY-A');

        $this->apiPost('/api/v1/terms', [
            'academic_year_id' => $year->id,
            'name' => 'Term X',
            'starts_on' => '2025-01-01',
            'ends_on' => '2025-06-01',
        ])->assertStatus(422)->assertJsonValidationErrors('starts_on');
    }

    public function test_stage_class_and_section_can_be_created_with_unique_codes(): void
    {
        $stage = $this->apiPost('/api/v1/stages', [
            'name' => 'Primary', 'code' => 'PRI', 'sequence' => 1,
        ])->assertStatus(201)->json('data');

        $class = $this->apiPost('/api/v1/classes', [
            'stage_id' => $stage['id'], 'name' => 'Class 1', 'code' => 'C1', 'capacity' => 40,
        ])->assertStatus(201)->json('data');

        $this->apiPost('/api/v1/classes', [
            'stage_id' => $stage['id'], 'name' => 'Duplicate', 'code' => 'C1',
        ])->assertStatus(422)->assertJsonValidationErrors('code');

        $this->apiPost('/api/v1/sections', [
            'class_room_id' => $class['id'], 'name' => 'A', 'capacity' => 35,
        ])->assertStatus(201)->assertJsonPath('data.name', 'A');
    }

    public function test_class_subject_mapping_is_unique_per_year_and_class(): void
    {
        $year = $this->year($this->campusA, '2026-2027', 'AY-A');
        $class = $this->classRoom($this->campusA, 'C1');
        $subject = Subject::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campusA->id,
            'name' => 'Mathematics', 'code' => 'MATH', 'type' => 'core',
        ]);

        $payload = [
            'academic_year_id' => $year->id,
            'class_room_id' => $class->id,
            'subject_id' => $subject->id,
        ];

        $this->apiPost('/api/v1/class-subjects', $payload)->assertStatus(201);

        $this->apiPost('/api/v1/class-subjects', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('subject_id');
    }

    public function test_teaching_assignment_requires_subject_mapped_to_class(): void
    {
        $year = $this->year($this->campusA, '2026-2027', 'AY-A');
        $class = $this->classRoom($this->campusA, 'C1');
        $subject = Subject::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campusA->id,
            'name' => 'Science', 'code' => 'SCI', 'type' => 'core',
        ]);

        $this->apiPost('/api/v1/teaching-assignments', [
            'academic_year_id' => $year->id,
            'teacher_user_id' => $this->admin->id,
            'subject_id' => $subject->id,
            'class_room_id' => $class->id,
        ])->assertStatus(422)->assertJsonValidationErrors('subject_id');
    }

    public function test_teaching_assignment_slot_conflict_is_rejected(): void
    {
        config(['academic.max_teacher_weekly_periods' => 100]);

        [$year, $class, $subject] = $this->assignableContext();

        $other = $this->actor($this->campusA, RoleName::Teacher);

        $this->apiPost('/api/v1/teaching-assignments', [
            'academic_year_id' => $year->id,
            'teacher_user_id' => $this->admin->id,
            'subject_id' => $subject->id,
            'class_room_id' => $class->id,
        ])->assertStatus(201);

        $this->apiPost('/api/v1/teaching-assignments', [
            'academic_year_id' => $year->id,
            'teacher_user_id' => $other->id,
            'subject_id' => $subject->id,
            'class_room_id' => $class->id,
        ])->assertStatus(409);
    }

    public function test_teacher_workload_limit_is_enforced(): void
    {
        config(['academic.max_teacher_weekly_periods' => 5]);

        [$year, $class, $subject] = $this->assignableContext();
        $second = Subject::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campusA->id,
            'name' => 'English', 'code' => 'ENG', 'type' => 'core',
        ]);
        ClassSubject::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campusA->id,
            'academic_year_id' => $year->id,
            'class_room_id' => $class->id,
            'subject_id' => $second->id,
        ]);

        $this->apiPost('/api/v1/teaching-assignments', [
            'academic_year_id' => $year->id,
            'teacher_user_id' => $this->admin->id,
            'subject_id' => $subject->id,
            'class_room_id' => $class->id,
            'weekly_periods' => 5,
        ])->assertStatus(201);

        $this->apiPost('/api/v1/teaching-assignments', [
            'academic_year_id' => $year->id,
            'teacher_user_id' => $this->admin->id,
            'subject_id' => $second->id,
            'class_room_id' => $class->id,
            'weekly_periods' => 5,
        ])->assertStatus(409);
    }

    public function test_academic_event_can_be_created(): void
    {
        $this->apiPost('/api/v1/academic-events', [
            'title' => 'Summer Holidays',
            'type' => 'holiday',
            'starts_on' => '2026-06-01',
            'ends_on' => '2026-07-15',
        ])->assertStatus(201)->assertJsonPath('data.type', 'holiday');
    }

    public function test_teacher_cannot_create_academic_structure(): void
    {
        $teacher = $this->actor($this->campusA, RoleName::Teacher);

        $this->withToken($teacher->createToken('t')->plainTextToken)
            ->postJson('/api/v1/academic-years', [
                'name' => '2027-2028',
                'code' => 'AY-2027',
                'starts_on' => '2027-04-01',
                'ends_on' => '2028-03-31',
            ])
            ->assertStatus(403);
    }

    public function test_product_owner_must_select_a_campus(): void
    {
        $owner = User::factory()->create();
        $owner->syncRoles([RoleName::PlatformAdmin->value]);

        $this->withToken($owner->createToken('t')->plainTextToken)
            ->getJson('/api/v1/academic-years')
            ->assertStatus(403);
    }

    private function actor(Campus $campus, RoleName $role): User
    {
        $user = User::factory()->create([
            'institution_id' => $campus->institution_id,
            'campus_id' => $campus->id,
        ]);
        $user->syncRoles([$role->value]);

        return $user;
    }

    private function apiGet(string $uri): TestResponse
    {
        return $this->withToken($this->admin->createToken('t')->plainTextToken)->getJson($uri);
    }

    private function apiPost(string $uri, array $payload): TestResponse
    {
        return $this->withToken($this->admin->createToken('t')->plainTextToken)->postJson($uri, $payload);
    }

    private function year(Campus $campus, string $name, string $code): AcademicYear
    {
        return AcademicYear::create([
            'institution_id' => $campus->institution_id,
            'campus_id' => $campus->id,
            'name' => $name,
            'code' => $code,
            'starts_on' => '2026-04-01',
            'ends_on' => '2027-03-31',
            'status' => 'active',
        ]);
    }

    private function classRoom(Campus $campus, string $code): ClassRoom
    {
        $stage = Stage::create([
            'institution_id' => $campus->institution_id,
            'campus_id' => $campus->id,
            'name' => 'Primary', 'code' => 'PRI', 'sequence' => 1,
        ]);

        return ClassRoom::create([
            'institution_id' => $campus->institution_id,
            'campus_id' => $campus->id,
            'stage_id' => $stage->id,
            'name' => 'Class 1', 'code' => $code,
        ]);
    }

    /**
     * @return array{0: AcademicYear, 1: ClassRoom, 2: Subject}
     */
    private function assignableContext(): array
    {
        $year = $this->year($this->campusA, '2026-2027', 'AY-A');
        $class = $this->classRoom($this->campusA, 'C1');
        $subject = Subject::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campusA->id,
            'name' => 'Mathematics', 'code' => 'MATH', 'type' => 'core',
        ]);

        $this->apiPost('/api/v1/class-subjects', [
            'academic_year_id' => $year->id,
            'class_room_id' => $class->id,
            'subject_id' => $subject->id,
        ])->assertStatus(201);

        return [$year, $class, $subject];
    }
}
