<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\ConductStatus;
use App\Enums\RoleName;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ClassRoom;
use App\Models\ConductRecord;
use App\Models\Institution;
use App\Models\Section;
use App\Models\Stage;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConductRecordTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private AcademicYear $year;

    private Student $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->institution = Institution::create(['name' => 'Test Trust', 'code' => 'TT']);
        $this->campus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus A', 'code' => 'A', 'type' => CampusType::School->value,
        ]);

        $this->admin = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $this->admin->syncRoles([RoleName::CampusAdmin->value]);

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

        $class = ClassRoom::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'stage_id' => $stage->id, 'name' => 'Class 1', 'code' => 'C1',
        ]);

        $section = Section::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'class_room_id' => $class->id, 'name' => 'A',
        ]);

        $this->student = Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'admission_no' => 'ADM-1',
            'first_name' => 'Ali', 'last_name' => 'Raza',
            'gender' => 'male', 'status' => 'active',
        ]);

        StudentEnrollment::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $this->student->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $class->id,
            'section_id' => $section->id,
            'status' => 'active',
        ]);
    }

    public function test_a_teacher_can_report_an_incident(): void
    {
        $teacher = $this->userWithRole(RoleName::Teacher);

        $this->as($teacher)->postJson('/api/v1/conduct-records', [
            'student_id' => $this->student->id,
            'academic_year_id' => $this->year->id,
            'category' => 'discipline',
            'severity' => 'medium',
            'title' => 'Disrupted the class',
            'description' => 'Repeatedly talked during the lesson.',
            'occurred_on' => '2026-09-20',
        ])->assertStatus(201)
            ->assertJsonPath('data.status', 'open')
            ->assertJsonPath('data.category', 'discipline');

        $this->assertDatabaseHas('conduct_records', [
            'student_id' => $this->student->id,
            'title' => 'Disrupted the class',
        ]);
    }

    public function test_a_record_can_be_resolved_by_an_approver(): void
    {
        $record = $this->record();

        $this->as($this->admin)->postJson("/api/v1/conduct-records/{$record->id}/resolve", [
            'status' => 'resolved',
            'action_taken' => 'Counselled the student.',
            'resolution_note' => 'Parent informed.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'resolved');

        $fresh = $record->refresh();
        $this->assertNotNull($fresh->resolved_at);
        $this->assertSame(ConductStatus::Resolved, $fresh->status);
    }

    public function test_a_teacher_cannot_resolve_a_record(): void
    {
        $record = $this->record();
        $teacher = $this->userWithRole(RoleName::Teacher);

        $this->as($teacher)->postJson("/api/v1/conduct-records/{$record->id}/resolve", [
            'status' => 'resolved',
        ])->assertStatus(403);
    }

    public function test_records_can_be_listed_and_filtered(): void
    {
        $this->record();

        $this->as($this->admin)->getJson('/api/v1/conduct-records?student_id='.$this->student->id)
            ->assertOk()
            ->assertJsonPath('data.0.student', 'Ali Raza')
            ->assertJsonPath('data.0.title', 'Late arrival');
    }

    public function test_student_history_includes_conduct_summary(): void
    {
        $this->record();

        $this->as($this->admin)->getJson("/api/v1/students/{$this->student->id}/history")
            ->assertOk()
            ->assertJsonPath('data.conduct.totals.total', 1)
            ->assertJsonPath('data.conduct.totals.open', 1)
            ->assertJsonPath('data.conduct.recent.0.title', 'Late arrival');
    }

    private function record(): ConductRecord
    {
        return ConductRecord::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $this->student->id,
            'academic_year_id' => $this->year->id,
            'category' => 'discipline',
            'severity' => 'low',
            'title' => 'Late arrival',
            'occurred_on' => '2026-09-18',
            'status' => ConductStatus::Open,
            'created_by' => $this->admin->id,
        ]);
    }

    private function userWithRole(RoleName $role): User
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
