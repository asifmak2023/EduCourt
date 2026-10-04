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
use App\Models\Subject;
use App\Models\TeachingAssignment;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeacherScopeTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private AcademicYear $year;

    private ClassRoom $classA;

    private ClassRoom $classB;

    private Section $sectionA;

    private Section $sectionB;

    private Subject $subject;

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

        $this->classA = ClassRoom::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'stage_id' => $stage->id, 'name' => 'Class A', 'code' => 'CA',
        ]);

        $this->classB = ClassRoom::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'stage_id' => $stage->id, 'name' => 'Class B', 'code' => 'CB',
        ]);

        $this->sectionA = Section::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'class_room_id' => $this->classA->id, 'name' => 'A',
        ]);

        $this->sectionB = Section::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'class_room_id' => $this->classB->id, 'name' => 'B',
        ]);

        $this->subject = Subject::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Mathematics', 'code' => 'MATH',
        ]);
    }

    public function test_teacher_sees_only_assigned_class_attendance(): void
    {
        $teacher = $this->teacher();
        $this->assign($teacher, $this->classA, $this->sectionA);

        $allowed = $this->student($this->classA, $this->sectionA, 'ADM-A');
        $blocked = $this->student($this->classB, $this->sectionB, 'ADM-B');

        $this->attendance($allowed, $this->classA, $this->sectionA);
        $this->attendance($blocked, $this->classB, $this->sectionB);

        $response = $this->as($teacher)->getJson('/api/v1/attendance/students')->assertOk();

        $ids = collect($response->json('data'))->pluck('student_id')->unique()->all();

        $this->assertContains($allowed->id, $ids);
        $this->assertNotContains($blocked->id, $ids);
    }

    public function test_teacher_without_assignments_sees_nothing(): void
    {
        $teacher = $this->teacher();

        $student = $this->student($this->classA, $this->sectionA, 'ADM-A');
        $this->attendance($student, $this->classA, $this->sectionA);

        $this->as($teacher)->getJson('/api/v1/attendance/students')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->as($teacher)->getJson('/api/v1/students')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_teacher_cannot_open_a_student_outside_assigned_classes(): void
    {
        $teacher = $this->teacher();
        $this->assign($teacher, $this->classA, $this->sectionA);

        $blocked = $this->student($this->classB, $this->sectionB, 'ADM-B');

        $this->as($teacher)->getJson("/api/v1/students/{$blocked->id}")->assertForbidden();
    }

    public function test_teacher_attendance_report_is_limited_to_assigned_students(): void
    {
        $teacher = $this->teacher();
        $this->assign($teacher, $this->classA, $this->sectionA);

        $allowed = $this->student($this->classA, $this->sectionA, 'ADM-A');
        $blocked = $this->student($this->classB, $this->sectionB, 'ADM-B');

        $this->attendance($allowed, $this->classA, $this->sectionA);
        $this->attendance($blocked, $this->classB, $this->sectionB);

        $response = $this->as($teacher)->getJson('/api/v1/attendance/students/report')->assertOk();

        $classes = collect($response->json('data.classes'))->pluck('class_room_id')->all();

        $this->assertContains($this->classA->id, $classes);
        $this->assertNotContains($this->classB->id, $classes);
    }

    public function test_teacher_cannot_mark_attendance_for_an_unassigned_student(): void
    {
        $teacher = $this->teacher();
        $this->assign($teacher, $this->classA, $this->sectionA);

        $blocked = $this->student($this->classB, $this->sectionB, 'ADM-B');

        $this->as($teacher)->postJson('/api/v1/attendance/students', [
            'student_id' => $blocked->id,
            'attendance_date' => now()->toDateString(),
            'status' => 'present',
        ])->assertForbidden();
    }

    public function test_campus_broad_role_still_sees_the_whole_campus(): void
    {
        $admin = $this->actor(RoleName::CampusAdmin);

        $a = $this->student($this->classA, $this->sectionA, 'ADM-A');
        $b = $this->student($this->classB, $this->sectionB, 'ADM-B');

        $this->attendance($a, $this->classA, $this->sectionA);
        $this->attendance($b, $this->classB, $this->sectionB);

        $response = $this->as($admin)->getJson('/api/v1/attendance/students')->assertOk();

        $ids = collect($response->json('data'))->pluck('student_id')->unique()->all();

        $this->assertContains($a->id, $ids);
        $this->assertContains($b->id, $ids);
    }

    public function test_teacher_with_a_campus_broad_role_is_not_narrowed(): void
    {
        $user = $this->actor(RoleName::Teacher);
        $user->assignRole(RoleName::CampusAdmin->value);

        $b = $this->student($this->classB, $this->sectionB, 'ADM-B');
        $this->attendance($b, $this->classB, $this->sectionB);

        $response = $this->as($user)->getJson('/api/v1/attendance/students')->assertOk();

        $ids = collect($response->json('data'))->pluck('student_id')->unique()->all();

        $this->assertContains($b->id, $ids);
    }

    private function teacher(): User
    {
        return $this->actor(RoleName::Teacher);
    }

    private function assign(User $teacher, ClassRoom $class, Section $section): void
    {
        TeachingAssignment::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'academic_year_id' => $this->year->id,
            'teacher_user_id' => $teacher->id,
            'subject_id' => $this->subject->id,
            'class_room_id' => $class->id,
            'section_id' => $section->id,
            'is_active' => true,
        ]);
    }

    private function student(ClassRoom $class, Section $section, string $admissionNo): Student
    {
        $student = Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'admission_no' => $admissionNo,
            'first_name' => 'Student', 'last_name' => $admissionNo,
            'gender' => 'male',
        ]);

        StudentEnrollment::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $student->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $class->id,
            'section_id' => $section->id,
            'status' => 'active',
        ]);

        return $student;
    }

    private function attendance(Student $student, ClassRoom $class, Section $section): void
    {
        StudentAttendance::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $student->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $class->id,
            'section_id' => $section->id,
            'attendance_date' => now()->toDateString(),
            'status' => 'present',
        ]);
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
