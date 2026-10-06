<?php

namespace Tests\Feature\Concerns;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ClassRoom;
use App\Models\Institution;
use App\Models\Section;
use App\Models\Stage;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\User;
use Database\Seeders\RbacSeeder;

trait BuildsFeeTenant
{
    protected Institution $institution;

    protected Campus $campus;

    protected AcademicYear $year;

    protected ClassRoom $classRoom;

    protected Section $section;

    protected Student $ali;

    protected Student $sara;

    protected function setUpFeeTenant(): void
    {
        $this->seed(RbacSeeder::class);

        $this->institution = Institution::create(['name' => 'Test Trust', 'code' => 'TT']);
        $this->campus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus A', 'code' => 'A', 'type' => CampusType::School->value,
        ]);

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

        $this->classRoom = ClassRoom::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'stage_id' => $stage->id, 'name' => 'Class 1', 'code' => 'C1',
        ]);

        $this->section = Section::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'class_room_id' => $this->classRoom->id, 'name' => 'A',
        ]);

        $this->ali = $this->makeStudent('ADM-1', 'Ali', 'Raza');
        $this->sara = $this->makeStudent('ADM-2', 'Sara', 'Khan');

        $this->enroll($this->ali);
        $this->enroll($this->sara);
    }

    protected function makeStudent(string $admissionNo, string $first, string $last): Student
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

    protected function enroll(Student $student): void
    {
        StudentEnrollment::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $student->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->classRoom->id,
            'section_id' => $this->section->id,
            'status' => 'active',
        ]);
    }

    protected function actor(RoleName $role): User
    {
        $user = User::factory()->create([
            'institution_id' => $this->campus->institution_id,
            'campus_id' => $this->campus->id,
        ]);
        $user->syncRoles([$role->value]);

        return $user;
    }

    /**
     * @param  array<int, string>  $permissions
     */
    protected function userWithPermissions(array $permissions): User
    {
        $user = User::factory()->create([
            'institution_id' => $this->campus->institution_id,
            'campus_id' => $this->campus->id,
        ]);
        $user->givePermissionTo($permissions);

        return $user;
    }

    protected function as(User $user): static
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('t')->plainTextToken);
    }

    /**
     * Create a fee charge through the counter so it carries an enrollment and
     * academic year, mirroring the real "generate voucher" flow.
     *
     * @return array<string, mixed>
     */
    protected function generateCharge(Student $student, float $amount = 12000, string $title = 'Tuition Fee', string $dueDate = '2026-07-10'): array
    {
        return $this->as($this->actor(RoleName::CampusAdmin))
            ->postJson('/api/v1/fee-counter/generate', [
                'student_id' => $student->id,
                'academic_year_id' => $this->year->id,
                'items' => [[
                    'billing_kind' => 'monthly',
                    'period_year' => 2026,
                    'period_month' => 7,
                    'title' => $title,
                    'amount' => $amount,
                    'due_date' => $dueDate,
                ]],
            ])
            ->assertStatus(201)
            ->json();
    }
}
