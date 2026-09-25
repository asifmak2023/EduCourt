<?php

namespace Tests\Feature;

use App\Enums\AdmissionStatus;
use App\Enums\CampusType;
use App\Enums\Gender;
use App\Enums\RoleName;
use App\Models\AcademicYear;
use App\Models\Admission;
use App\Models\Campus;
use App\Models\ClassRoom;
use App\Models\Institution;
use App\Models\Section;
use App\Models\Stage;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class AdmissionTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private User $teacher;

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

        $this->admin = $this->actor(RoleName::CampusAdmin);
        $this->teacher = $this->actor(RoleName::Teacher);

        $this->year = AcademicYear::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => '2026-2027', 'code' => 'AY26',
            'starts_on' => '2026-04-01', 'ends_on' => '2027-03-31',
            'status' => 'active', 'is_current' => true,
        ]);

        $this->class = ClassRoom::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'stage_id' => Stage::create([
                'institution_id' => $this->institution->id,
                'campus_id' => $this->campus->id,
                'name' => 'Primary', 'code' => 'PRI', 'sequence' => 1,
            ])->id,
            'name' => 'Class 1', 'code' => 'C1',
        ]);

        $this->section = Section::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'class_room_id' => $this->class->id,
            'name' => 'A',
        ]);
    }

    public function test_application_numbers_are_sequential_per_campus(): void
    {
        $first = $this->createAdmission();
        $second = $this->createAdmission(['first_name' => 'Sara']);

        $this->assertSame('APP-00001', $first->application_no);
        $this->assertSame('APP-00002', $second->application_no);
    }

    public function test_admission_can_move_through_review_to_enrollment(): void
    {
        $admission = $this->createAdmission();

        $this->as($this->admin)->postJson("/api/v1/admissions/{$admission->id}/submit")
            ->assertOk()
            ->assertJsonPath('data.status', AdmissionStatus::UnderReview->value);

        $this->as($this->admin)->postJson("/api/v1/admissions/{$admission->id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', AdmissionStatus::Approved->value);

        $response = $this->as($this->admin)->postJson("/api/v1/admissions/{$admission->id}/enroll", [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'section_id' => $this->section->id,
            'roll_number' => '7',
        ])->assertStatus(201)
            ->assertJsonPath('data.status', AdmissionStatus::Enrolled->value)
            ->assertJsonPath('student.admission_no', 'ADM-00001');

        $studentId = $response->json('student.id');

        $this->assertDatabaseHas('students', [
            'id' => $studentId,
            'campus_id' => $this->campus->id,
            'first_name' => 'Hassan',
            'status' => 'active',
        ]);

        $this->assertDatabaseHas('student_enrollments', [
            'student_id' => $studentId,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'roll_number' => '7',
        ]);

        $this->assertDatabaseHas('student_guardian', ['student_id' => $studentId]);

        $this->assertSame(1, Student::query()->whereKey($studentId)->count());
        $this->assertSame(1, StudentEnrollment::query()->where('student_id', $studentId)->count());
    }

    public function test_only_approved_admissions_can_be_enrolled(): void
    {
        $admission = $this->createAdmission();

        $this->as($this->admin)->postJson("/api/v1/admissions/{$admission->id}/enroll", [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
        ])->assertStatus(422)->assertJsonValidationErrors('status');
    }

    public function test_enrolled_admission_cannot_be_rejected_or_edited(): void
    {
        $admission = $this->enrolledAdmission();

        $this->as($this->admin)->postJson("/api/v1/admissions/{$admission->id}/reject", [
            'rejection_reason' => 'Late application',
        ])->assertStatus(422)->assertJsonValidationErrors('status');

        $this->as($this->admin)->putJson("/api/v1/admissions/{$admission->id}", [
            'first_name' => 'Changed',
        ])->assertStatus(422)->assertJsonValidationErrors('status');
    }

    public function test_rejection_requires_a_reason_and_blocks_approval(): void
    {
        $admission = $this->createAdmission();

        $this->as($this->admin)->postJson("/api/v1/admissions/{$admission->id}/reject", [])
            ->assertStatus(422)->assertJsonValidationErrors('rejection_reason');

        $this->as($this->admin)->postJson("/api/v1/admissions/{$admission->id}/reject", [
            'rejection_reason' => 'No seats available',
        ])->assertOk()->assertJsonPath('data.status', AdmissionStatus::Rejected->value);

        $this->as($this->admin)->postJson("/api/v1/admissions/{$admission->id}/approve")
            ->assertStatus(422)->assertJsonValidationErrors('status');
    }

    public function test_documents_can_be_uploaded_and_downloaded(): void
    {
        $admission = $this->createAdmission();

        $upload = $this->as($this->admin)->post("/api/v1/admissions/{$admission->id}/documents", [
            'type' => 'birth_certificate',
            'title' => 'Birth Certificate',
            'file' => UploadedFile::fake()->create('birth.pdf', 32, 'application/pdf'),
        ])->assertStatus(201)
            ->assertJsonPath('data.type', 'birth_certificate')
            ->assertJsonPath('data.original_name', 'birth.pdf');

        $documentId = $upload->json('data.id');

        $this->assertDatabaseHas('admission_documents', [
            'id' => $documentId,
            'admission_id' => $admission->id,
            'campus_id' => $this->campus->id,
        ]);

        $this->as($this->admin)
            ->get("/api/v1/admissions/{$admission->id}/documents/{$documentId}/download")
            ->assertOk()
            ->assertHeader('content-disposition', 'attachment; filename=birth.pdf');

        $this->as($this->admin)->deleteJson("/api/v1/admissions/{$admission->id}/documents/{$documentId}")
            ->assertOk();

        $this->assertSoftDeleted('admission_documents', ['id' => $documentId]);
    }

    public function test_teacher_cannot_manage_admissions(): void
    {
        $this->as($this->teacher)->getJson('/api/v1/admissions')->assertStatus(403);
        $this->as($this->teacher)->postJson('/api/v1/admissions', [
            'first_name' => 'Nope',
            'last_name' => 'Nope',
        ])->assertStatus(403);
    }

    private function createAdmission(array $overrides = []): Admission
    {
        $response = $this->as($this->admin)->postJson('/api/v1/admissions', array_merge([
            'first_name' => 'Hassan',
            'last_name' => 'Iqbal',
            'gender' => Gender::Male->value,
            'date_of_birth' => '2016-05-12',
            'class_room_id' => $this->class->id,
            'academic_year_id' => $this->year->id,
            'guardian_name' => 'Tariq Iqbal',
            'guardian_phone' => '+92-300-1000001',
            'guardian_email' => 'tariq@demo-eis.test',
            'guardian_relation' => 'father',
        ], $overrides))->assertStatus(201);

        return Admission::query()->findOrFail($response->json('data.id'));
    }

    private function enrolledAdmission(): Admission
    {
        $admission = $this->createAdmission();

        $this->as($this->admin)->postJson("/api/v1/admissions/{$admission->id}/approve")->assertOk();

        $this->as($this->admin)->postJson("/api/v1/admissions/{$admission->id}/enroll", [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
        ])->assertStatus(201);

        return $admission->refresh();
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
