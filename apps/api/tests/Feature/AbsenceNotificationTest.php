<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ClassRoom;
use App\Models\Guardian;
use App\Models\Institution;
use App\Models\Section;
use App\Models\Stage;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AbsenceNotificationTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private User $teacher;

    private Student $student;

    private ClassRoom $class;

    private AcademicYear $year;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->institution = Institution::create(['name' => 'Test Trust', 'code' => 'TT']);
        $this->campus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus A', 'code' => 'A', 'type' => CampusType::School->value,
        ]);

        $this->admin = $this->userWithRole(RoleName::CampusAdmin);
        $this->teacher = $this->userWithRole(RoleName::Teacher);

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

        $section = Section::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'class_room_id' => $this->class->id, 'name' => 'A',
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
            'class_room_id' => $this->class->id,
            'section_id' => $section->id,
            'status' => 'active',
        ]);

        $guardian = Guardian::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Imran Raza',
            'email' => 'imran@example.test',
            'phone' => '+92-300-0000001',
        ]);

        $this->student->guardians()->attach($guardian->id, [
            'relationship' => 'father', 'is_primary' => true,
        ]);
    }

    public function test_marking_a_student_absent_queues_a_guardian_notification(): void
    {
        $this->as($this->teacher)->postJson('/api/v1/attendance/students', [
            'student_id' => $this->student->id,
            'attendance_date' => '2026-09-21',
            'status' => 'absent',
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
        ])->assertStatus(201);

        $this->assertDatabaseHas('app_notifications', [
            'student_id' => $this->student->id,
            'type' => 'absence',
            'status' => 'pending',
            'recipient_email' => 'imran@example.test',
        ]);
    }

    public function test_marking_a_student_present_does_not_queue_a_notification(): void
    {
        $this->as($this->teacher)->postJson('/api/v1/attendance/students', [
            'student_id' => $this->student->id,
            'attendance_date' => '2026-09-21',
            'status' => 'present',
            'academic_year_id' => $this->year->id,
        ])->assertStatus(201);

        $this->assertDatabaseCount('app_notifications', 0);
    }

    public function test_re_marking_absence_does_not_duplicate_the_notification(): void
    {
        $payload = [
            'student_id' => $this->student->id,
            'attendance_date' => '2026-09-21',
            'status' => 'absent',
            'academic_year_id' => $this->year->id,
        ];

        $this->as($this->teacher)->postJson('/api/v1/attendance/students', $payload)->assertStatus(201);
        $this->as($this->teacher)->postJson('/api/v1/attendance/students', $payload)->assertStatus(201);

        $this->assertDatabaseCount('app_notifications', 1);
    }

    public function test_absence_notifications_can_be_queued_in_bulk_and_sent(): void
    {
        $this->as($this->teacher)->postJson('/api/v1/attendance/students', [
            'student_id' => $this->student->id,
            'attendance_date' => '2026-09-21',
            'status' => 'absent',
            'academic_year_id' => $this->year->id,
        ])->assertStatus(201);

        $this->as($this->admin)->postJson('/api/v1/notifications/queue-absences', [
            'attendance_date' => '2026-09-21',
            'class_room_id' => $this->class->id,
        ])->assertStatus(201)
            ->assertJsonPath('created', 0);

        $list = $this->as($this->admin)->getJson('/api/v1/notifications?type=absence')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $id = $list->json('data.0.id');

        $this->as($this->admin)->postJson("/api/v1/notifications/{$id}/send")
            ->assertOk()
            ->assertJsonPath('data.status', 'sent');
    }

    public function test_a_teacher_cannot_send_notifications(): void
    {
        $this->assertFalse($this->teacher->hasPermissionTo('notification.send'));
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
