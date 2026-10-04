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
use Tests\TestCase;

class RoleScopeTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private AcademicYear $year;

    private ClassRoom $class;

    private Section $section;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->institution = Institution::create(['name' => 'Test Trust', 'code' => 'TT']);
        $this->campus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus A', 'code' => 'A', 'type' => CampusType::School->value,
        ]);

        $this->year = AcademicYear::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => '2026-2027', 'code' => 'AY', 'starts_on' => '2026-04-01',
            'ends_on' => '2027-03-31', 'status' => 'active', 'is_current' => true,
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
    }

    public function test_portal_roles_hold_no_staff_module_permissions(): void
    {
        foreach ([RoleName::Student, RoleName::ParentGuardian] as $role) {
            $names = \Spatie\Permission\Models\Role::findByName($role->value, 'web')
                ->permissions->pluck('name');

            $this->assertSame(
                ['appearance.view'],
                $names->sort()->values()->all(),
                "{$role->value} should hold only the baseline permission."
            );
        }
    }

    public function test_a_student_cannot_reach_staff_endpoints(): void
    {
        $student = $this->actor(RoleName::Student);

        $this->as($student)->getJson('/api/v1/attendance/students')->assertForbidden();
        $this->as($student)->getJson('/api/v1/attendance/students/report')->assertForbidden();
        $this->as($student)->getJson('/api/v1/students')->assertForbidden();
    }

    public function test_a_parent_cannot_reach_staff_endpoints(): void
    {
        $parent = $this->actor(RoleName::ParentGuardian);

        $this->as($parent)->getJson('/api/v1/attendance/students')->assertForbidden();
        $this->as($parent)->getJson('/api/v1/students')->assertForbidden();
        $this->as($parent)->getJson('/api/v1/fee-vouchers')->assertForbidden();
    }

    public function test_a_campus_admin_still_reaches_staff_endpoints(): void
    {
        $admin = $this->actor(RoleName::CampusAdmin);

        $this->as($admin)->getJson('/api/v1/attendance/students')->assertOk();
        $this->as($admin)->getJson('/api/v1/students')->assertOk();
    }

    public function test_portal_data_is_still_available(): void
    {
        $studentUser = $this->actor(RoleName::Student);

        $student = Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'user_id' => $studentUser->id,
            'admission_no' => 'ADM-1', 'first_name' => 'Ali', 'last_name' => 'Raza',
            'gender' => 'male',
        ]);

        StudentEnrollment::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $student->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'section_id' => $this->section->id,
            'status' => 'active',
        ]);

        StudentAttendance::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $student->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'section_id' => $this->section->id,
            'attendance_date' => now()->toDateString(),
            'status' => 'present',
        ]);

        $this->as($studentUser)
            ->getJson('/api/v1/me/attendance')
            ->assertOk()
            ->assertJsonPath('summary.present', 1)
            ->assertJsonPath('student.id', $student->id);
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

    private function as(User $user): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('t')->plainTextToken);
    }
}
