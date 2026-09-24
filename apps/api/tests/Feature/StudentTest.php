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
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private User $teacher;

    private AcademicYear $year;

    private ClassRoom $classOne;

    private ClassRoom $classTwo;

    private Section $sectionOne;

    private Section $sectionTwo;

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
            'name' => '2026-2027', 'code' => 'AY1',
            'starts_on' => '2026-04-01', 'ends_on' => '2027-03-31', 'status' => 'active',
        ]);

        $stage = Stage::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Primary', 'code' => 'PRI', 'sequence' => 1,
        ]);

        $this->classOne = ClassRoom::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'stage_id' => $stage->id, 'name' => 'Class 1', 'code' => 'C1',
        ]);

        $this->classTwo = ClassRoom::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'stage_id' => $stage->id, 'name' => 'Class 2', 'code' => 'C2',
        ]);

        $this->sectionOne = Section::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'class_room_id' => $this->classOne->id, 'name' => 'A',
        ]);

        $this->sectionTwo = Section::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'class_room_id' => $this->classTwo->id, 'name' => 'A',
        ]);
    }

    public function test_student_can_be_created_with_guardian_and_enrollment(): void
    {
        $guardian = $this->guardian('Imran Raza', '+92-300-1');

        $response = $this->as($this->admin)->postJson('/api/v1/students', [
            'first_name' => 'Ali',
            'last_name' => 'Raza',
            'gender' => 'male',
            'guardians' => [
                ['guardian_id' => $guardian->id, 'relationship' => 'father', 'is_primary' => true],
            ],
            'enrollment' => [
                'academic_year_id' => $this->year->id,
                'class_room_id' => $this->classOne->id,
                'section_id' => $this->sectionOne->id,
                'roll_number' => '1',
            ],
        ])->assertStatus(201)
            ->assertJsonPath('data.full_name', 'Ali Raza')
            ->assertJsonCount(1, 'data.guardians')
            ->assertJsonCount(1, 'data.enrollments');

        $this->assertStringStartsWith('ADM-', $response->json('data.admission_no'));
    }

    public function test_admission_number_must_be_unique_per_campus(): void
    {
        $this->student('ADM-XYZ', 'One', 'Student');

        $this->as($this->admin)->postJson('/api/v1/students', [
            'admission_no' => 'ADM-XYZ',
            'first_name' => 'Two',
            'last_name' => 'Student',
            'gender' => 'female',
        ])->assertStatus(422)->assertJsonValidationErrors('admission_no');
    }

    public function test_enrollment_rejects_a_section_from_another_class(): void
    {
        $student = $this->student('ADM-1', 'Ali', 'Raza');

        $this->as($this->admin)->postJson('/api/v1/student-enrollments', [
            'student_id' => $student->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->classOne->id,
            'section_id' => $this->sectionTwo->id,
        ])->assertStatus(422);
    }

    public function test_student_cannot_be_enrolled_twice_in_the_same_year(): void
    {
        $student = $this->student('ADM-1', 'Ali', 'Raza');

        $payload = [
            'student_id' => $student->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->classOne->id,
            'section_id' => $this->sectionOne->id,
        ];

        $this->as($this->admin)->postJson('/api/v1/student-enrollments', $payload)->assertStatus(201);
        $this->as($this->admin)->postJson('/api/v1/student-enrollments', $payload)->assertStatus(422);
    }

    public function test_student_can_be_withdrawn(): void
    {
        $student = $this->student('ADM-1', 'Ali', 'Raza');

        $this->as($this->admin)->postJson('/api/v1/student-enrollments', [
            'student_id' => $student->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->classOne->id,
            'section_id' => $this->sectionOne->id,
        ])->assertStatus(201);

        $this->as($this->admin)
            ->postJson("/api/v1/students/{$student->id}/withdraw", ['date' => '2026-10-01'])
            ->assertOk()
            ->assertJsonPath('data.status', 'withdrawn');

        $this->assertDatabaseHas('student_enrollments', [
            'student_id' => $student->id,
            'status' => 'withdrawn',
            'ends_on' => '2026-10-01',
        ]);
    }

    public function test_promotion_moves_active_students_to_the_next_year(): void
    {
        $student = $this->student('ADM-1', 'Ali', 'Raza');

        $this->as($this->admin)->postJson('/api/v1/student-enrollments', [
            'student_id' => $student->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->classOne->id,
            'section_id' => $this->sectionOne->id,
        ])->assertStatus(201);

        $nextYear = AcademicYear::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => '2027-2028', 'code' => 'AY2',
            'starts_on' => '2027-04-01', 'ends_on' => '2028-03-31', 'status' => 'active',
        ]);

        $this->as($this->admin)->postJson('/api/v1/students/promote', [
            'from_academic_year_id' => $this->year->id,
            'to_academic_year_id' => $nextYear->id,
            'from_class_room_id' => $this->classOne->id,
            'to_class_room_id' => $this->classTwo->id,
            'section_id' => $this->sectionTwo->id,
        ])->assertOk()->assertJsonPath('promoted', 1);

        $this->assertDatabaseHas('student_enrollments', [
            'student_id' => $student->id,
            'academic_year_id' => $this->year->id,
            'status' => 'promoted',
        ]);

        $this->assertDatabaseHas('student_enrollments', [
            'student_id' => $student->id,
            'academic_year_id' => $nextYear->id,
            'class_room_id' => $this->classTwo->id,
            'status' => 'active',
        ]);
    }

    public function test_students_can_be_filtered_by_class(): void
    {
        $this->enroll($this->student('ADM-1', 'Ali', 'Raza'), $this->classOne, $this->sectionOne);
        $this->enroll($this->student('ADM-2', 'Sara', 'Khan'), $this->classTwo, $this->sectionTwo);

        $this->as($this->admin)
            ->getJson("/api/v1/students?class_room_id={$this->classOne->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.admission_no', 'ADM-1');
    }

    public function test_teacher_cannot_create_students(): void
    {
        $this->as($this->teacher)->postJson('/api/v1/students', [
            'first_name' => 'Ali',
            'last_name' => 'Raza',
            'gender' => 'male',
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

    private function student(string $admissionNo, string $first, string $last): Student
    {
        return Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'admission_no' => $admissionNo,
            'first_name' => $first,
            'last_name' => $last,
            'gender' => 'male',
        ]);
    }

    private function guardian(string $name, string $phone): Guardian
    {
        return Guardian::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => $name,
            'phone' => $phone,
        ]);
    }

    private function enroll(Student $student, ClassRoom $class, Section $section): void
    {
        $this->as($this->admin)->postJson('/api/v1/student-enrollments', [
            'student_id' => $student->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $class->id,
            'section_id' => $section->id,
        ])->assertStatus(201);
    }
}
