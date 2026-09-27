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
use App\Models\Student;
use App\Models\StudentAttendance;
use App\Models\StudentEnrollment;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class OfflineAttendanceTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private User $teacher;

    private AcademicYear $year;

    private ClassRoom $class;

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
    }

    public function test_offline_batch_is_applied_and_replayed_idempotently(): void
    {
        $payload = [
            'device_id' => 'tablet-7',
            'client_batch_uuid' => (string) Str::uuid(),
            'records' => [[
                'client_uuid' => (string) Str::uuid(),
                'student_id' => $this->student->id,
                'attendance_date' => '2026-09-21',
                'status' => 'absent',
                'captured_at' => now()->toIso8601String(),
                'academic_year_id' => $this->year->id,
                'class_room_id' => $this->class->id,
            ]],
        ];

        $this->api($this->teacher)->postJson('/api/v1/attendance/sync', $payload)
            ->assertStatus(201)
            ->assertJsonPath('data.applied_count', 1)
            ->assertJsonPath('data.duplicate_count', 0)
            ->assertJsonPath('data.device_id', 'tablet-7');

        $this->assertDatabaseHas('student_attendances', [
            'student_id' => $this->student->id,
            'attendance_date' => '2026-09-21',
            'status' => 'absent',
            'source' => 'offline',
        ]);
        $this->assertDatabaseCount('app_notifications', 1);

        $this->api($this->teacher)->postJson('/api/v1/attendance/sync', $payload)
            ->assertStatus(201)
            ->assertJsonPath('data.applied_count', 1);

        $this->assertDatabaseCount('student_attendances', 1);
        $this->assertDatabaseCount('attendance_sync_batches', 1);
    }

    public function test_duplicate_client_uuid_is_skipped(): void
    {
        $clientUuid = (string) Str::uuid();

        $record = [
            'client_uuid' => $clientUuid,
            'student_id' => $this->student->id,
            'attendance_date' => '2026-09-22',
            'status' => 'present',
            'captured_at' => now()->toIso8601String(),
        ];

        $this->api($this->admin)->postJson('/api/v1/attendance/sync', ['records' => [$record]])
            ->assertStatus(201)
            ->assertJsonPath('data.applied_count', 1);

        $this->api($this->admin)->postJson('/api/v1/attendance/sync', ['records' => [$record]])
            ->assertStatus(201)
            ->assertJsonPath('data.applied_count', 0)
            ->assertJsonPath('data.duplicate_count', 1);

        $this->assertDatabaseCount('student_attendances', 1);
    }

    public function test_newer_server_record_wins_but_newer_capture_overwrites(): void
    {
        $this->api($this->admin)->postJson('/api/v1/attendance/students', [
            'student_id' => $this->student->id,
            'attendance_date' => '2026-09-23',
            'status' => 'absent',
            'academic_year_id' => $this->year->id,
        ])->assertStatus(201);

        $this->api($this->admin)->postJson('/api/v1/attendance/sync', [
            'records' => [[
                'client_uuid' => (string) Str::uuid(),
                'student_id' => $this->student->id,
                'attendance_date' => '2026-09-23',
                'status' => 'present',
                'captured_at' => now()->subHour()->toIso8601String(),
            ]],
        ])->assertStatus(201)->assertJsonPath('data.conflict_count', 1);

        $this->assertSame('absent', StudentAttendance::query()
            ->where('student_id', $this->student->id)
            ->whereDate('attendance_date', '2026-09-23')
            ->firstOrFail()->status->value);

        $this->api($this->admin)->postJson('/api/v1/attendance/sync', [
            'records' => [[
                'client_uuid' => (string) Str::uuid(),
                'student_id' => $this->student->id,
                'attendance_date' => '2026-09-23',
                'status' => 'present',
                'captured_at' => now()->addMinutes(10)->toIso8601String(),
            ]],
        ])->assertStatus(201)->assertJsonPath('data.applied_count', 1);

        $this->assertSame('present', StudentAttendance::query()
            ->where('student_id', $this->student->id)
            ->whereDate('attendance_date', '2026-09-23')
            ->firstOrFail()->status->value);
    }

    public function test_sync_requires_permission_and_rejects_unknown_students(): void
    {
        $studentUser = $this->actor(RoleName::Student);

        $this->api($studentUser)->postJson('/api/v1/attendance/sync', [
            'records' => [[
                'client_uuid' => (string) Str::uuid(),
                'student_id' => $this->student->id,
                'attendance_date' => '2026-09-24',
                'status' => 'present',
                'captured_at' => now()->toIso8601String(),
            ]],
        ])->assertStatus(403);

        $this->api($this->admin)->postJson('/api/v1/attendance/sync', [
            'records' => [[
                'client_uuid' => (string) Str::uuid(),
                'student_id' => 99999,
                'attendance_date' => '2026-09-24',
                'status' => 'present',
                'captured_at' => now()->toIso8601String(),
            ]],
        ])->assertStatus(422);
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
