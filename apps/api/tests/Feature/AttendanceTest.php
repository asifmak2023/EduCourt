<?php

namespace Tests\Feature;

use App\Enums\AttendanceStatus;
use App\Enums\CampusType;
use App\Enums\Gender;
use App\Enums\RoleName;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ClassRoom;
use App\Models\Institution;
use App\Models\LeaveRequest;
use App\Models\Section;
use App\Models\StaffAttendance;
use App\Models\Stage;
use App\Models\Student;
use App\Models\StudentAttendance;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private User $teacher;

    private User $accountant;

    private AcademicYear $year;

    private ClassRoom $class;

    private Section $section;

    private Student $boy;

    private Student $girl;

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
        $this->accountant = $this->actor(RoleName::Accountant);

        $this->year = AcademicYear::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => '2026-2027', 'code' => 'AY26',
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

        $this->boy = $this->student('ADM-00001', 'Ali', Gender::Male);
        $this->girl = $this->student('ADM-00002', 'Sara', Gender::Female);
    }

    public function test_student_attendance_can_be_marked_in_bulk_and_summarised(): void
    {
        $this->as($this->admin)->postJson('/api/v1/attendance/students/bulk', [
            'attendance_date' => '2026-09-21',
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'section_id' => $this->section->id,
            'records' => [
                ['student_id' => $this->boy->id, 'status' => AttendanceStatus::Present->value],
                ['student_id' => $this->girl->id, 'status' => AttendanceStatus::Present->value],
            ],
        ])->assertStatus(201);

        $this->as($this->admin)->postJson('/api/v1/attendance/students/bulk', [
            'attendance_date' => '2026-09-22',
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'section_id' => $this->section->id,
            'records' => [
                ['student_id' => $this->boy->id, 'status' => AttendanceStatus::Absent->value],
                ['student_id' => $this->girl->id, 'status' => AttendanceStatus::Leave->value],
            ],
        ])->assertStatus(201);

        $this->assertSame(4, StudentAttendance::query()->count());

        $this->as($this->admin)
            ->getJson('/api/v1/attendance/students/report?from=2026-09-21&to=2026-09-22')
            ->assertOk()
            ->assertJsonPath('data.classes.0.total', 2)
            ->assertJsonPath('data.classes.0.boys', 1)
            ->assertJsonPath('data.classes.0.girls', 1)
            ->assertJsonPath('data.classes.0.present', 2)
            ->assertJsonPath('data.classes.0.absent', 1)
            ->assertJsonPath('data.classes.0.leave', 1)
            ->assertJsonPath('data.totals.present', 2);

        $this->as($this->admin)
            ->getJson("/api/v1/attendance/students/students/{$this->boy->id}/report?from=2026-09-21&to=2026-09-22")
            ->assertOk()
            ->assertJsonPath('data.present', 1)
            ->assertJsonPath('data.absent', 1)
            ->assertJsonPath('data.marked', 2);
    }

    public function test_marking_the_same_student_and_day_updates_instead_of_duplicating(): void
    {
        $this->markStudent($this->boy, '2026-09-21', AttendanceStatus::Absent);

        $this->as($this->admin)->postJson('/api/v1/attendance/students', [
            'student_id' => $this->boy->id,
            'attendance_date' => '2026-09-21',
            'status' => AttendanceStatus::Present->value,
            'class_room_id' => $this->class->id,
        ])->assertStatus(201);

        $this->assertSame(1, StudentAttendance::query()->where('student_id', $this->boy->id)->count());
        $this->assertDatabaseHas('student_attendances', [
            'student_id' => $this->boy->id,
            'status' => AttendanceStatus::Present->value,
        ]);
    }

    public function test_staff_attendance_can_be_marked_and_reported(): void
    {
        $this->as($this->admin)->postJson('/api/v1/attendance/staff/bulk', [
            'attendance_date' => '2026-09-21',
            'records' => [
                ['user_id' => $this->teacher->id, 'status' => AttendanceStatus::Present->value, 'check_in' => '08:05', 'check_out' => '14:00'],
                ['user_id' => $this->admin->id, 'status' => AttendanceStatus::Late->value],
            ],
        ])->assertStatus(201);

        $this->assertSame(2, StaffAttendance::query()->count());

        $this->as($this->admin)
            ->getJson('/api/v1/attendance/staff/report?from=2026-09-21&to=2026-09-21')
            ->assertOk()
            ->assertJsonPath('data.by_status.present', 1)
            ->assertJsonPath('data.by_status.late', 1)
            ->assertJsonPath('data.by_staff.0.days', 1);
    }

    public function test_leave_request_approval_writes_leave_attendance(): void
    {
        $response = $this->as($this->teacher)->postJson('/api/v1/leave-requests', [
            'leave_type' => 'sick',
            'from_date' => '2026-10-01',
            'to_date' => '2026-10-02',
            'reason' => 'Medical rest',
        ])->assertStatus(201)
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.days', '2.0')
            ->assertJsonPath('data.user_id', $this->teacher->id);

        $id = $response->json('data.id');

        $this->as($this->admin)->postJson("/api/v1/leave-requests/{$id}/approve", [
            'decision_note' => 'Approved',
        ])->assertOk()->assertJsonPath('data.status', 'approved');

        $this->assertSame(2, StaffAttendance::query()
            ->where('user_id', $this->teacher->id)
            ->where('status', AttendanceStatus::Leave->value)
            ->count());

        $this->as($this->admin)->postJson("/api/v1/leave-requests/{$id}/approve")
            ->assertStatus(422)->assertJsonValidationErrors('status');
    }

    public function test_teacher_cannot_approve_leave_and_accountant_cannot_view_attendance(): void
    {
        $leave = LeaveRequest::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'user_id' => $this->teacher->id,
            'leave_type' => 'casual',
            'from_date' => '2026-10-05',
            'to_date' => '2026-10-05',
            'days' => 1,
            'status' => 'pending',
        ]);

        $this->as($this->teacher)->postJson("/api/v1/leave-requests/{$leave->id}/approve")
            ->assertStatus(403);

        $this->as($this->teacher)->getJson('/api/v1/attendance/students')->assertOk();

        $this->as($this->accountant)->getJson('/api/v1/attendance/students')->assertStatus(403);
        $this->as($this->accountant)->getJson('/api/v1/attendance/staff')->assertStatus(403);
    }

    private function markStudent(Student $student, string $date, AttendanceStatus $status): void
    {
        $this->as($this->admin)->postJson('/api/v1/attendance/students', [
            'student_id' => $student->id,
            'attendance_date' => $date,
            'status' => $status->value,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'section_id' => $this->section->id,
        ])->assertStatus(201);
    }

    private function student(string $admissionNo, string $firstName, Gender $gender): Student
    {
        return Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'admission_no' => $admissionNo,
            'first_name' => $firstName,
            'last_name' => 'Test',
            'gender' => $gender,
            'admission_date' => '2026-04-01',
            'status' => 'active',
        ]);
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
