<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ClassRoom;
use App\Models\Institution;
use App\Models\Section;
use App\Models\Stage;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReferenceDataTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->institution = Institution::create(['name' => 'Test Trust', 'code' => 'TT']);
        $this->campus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus A', 'code' => 'A', 'type' => CampusType::School->value,
        ]);
    }

    public function test_admissions_officer_can_read_campus_academic_options(): void
    {
        $year = AcademicYear::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => '2026-2027', 'code' => 'AY1',
            'starts_on' => '2026-04-01', 'ends_on' => '2027-03-31', 'status' => 'active',
        ]);

        $stage = Stage::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Primary', 'code' => 'PRI', 'sequence' => 1,
        ]);

        $class = ClassRoom::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'stage_id' => $stage->id, 'name' => 'Class 1', 'code' => 'C1',
        ]);

        Section::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'class_room_id' => $class->id, 'name' => 'A',
        ]);

        $officer = $this->actor(RoleName::AdmissionsOfficer);

        $this->as($officer)
            ->getJson('/api/v1/reference/academic-options')
            ->assertOk()
            ->assertJsonPath('data.academic_years.0.id', $year->id)
            ->assertJsonPath('data.class_rooms.0.id', $class->id)
            ->assertJsonPath('data.sections.0.class_room_id', $class->id);
    }

    public function test_inactive_classes_are_excluded(): void
    {
        $stage = Stage::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Primary', 'code' => 'PRI', 'sequence' => 1,
        ]);

        ClassRoom::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'stage_id' => $stage->id, 'name' => 'Class 1', 'code' => 'C1', 'is_active' => true,
        ]);

        ClassRoom::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'stage_id' => $stage->id, 'name' => 'Closed', 'code' => 'C2', 'is_active' => false,
        ]);

        $officer = $this->actor(RoleName::AdmissionsOfficer);

        $this->as($officer)
            ->getJson('/api/v1/reference/academic-options')
            ->assertOk()
            ->assertJsonCount(1, 'data.class_rooms')
            ->assertJsonPath('data.class_rooms.0.name', 'Class 1');
    }

    public function test_role_without_admission_or_student_view_is_forbidden(): void
    {
        $librarian = $this->actor(RoleName::Librarian);

        $this->as($librarian)
            ->getJson('/api/v1/reference/academic-options')
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
}
