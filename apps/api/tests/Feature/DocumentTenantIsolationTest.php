<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\Admission;
use App\Models\AdmissionDocument;
use App\Models\Campus;
use App\Models\Institution;
use App\Models\StaffDocument;
use App\Models\StaffMember;
use App\Models\Student;
use App\Models\StudentDocument;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Verifies that private student/staff/admission documents are isolated by
 * campus and institution, and can only be downloaded by authorised users in
 * the same tenant (audit P0 production security verification).
 */
class DocumentTenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institutionA;

    private Institution $institutionB;

    private Campus $campusA1;

    private Campus $campusA2;

    private Campus $campusB1;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);
        Storage::fake('local');

        $this->institutionA = Institution::create(['name' => 'Trust A', 'code' => 'TA']);
        $this->institutionB = Institution::create(['name' => 'Trust B', 'code' => 'TB']);

        $this->campusA1 = Campus::create([
            'institution_id' => $this->institutionA->id,
            'name' => 'A-1', 'code' => 'A1', 'type' => CampusType::School->value,
        ]);
        $this->campusA2 = Campus::create([
            'institution_id' => $this->institutionA->id,
            'name' => 'A-2', 'code' => 'A2', 'type' => CampusType::School->value,
        ]);
        $this->campusB1 = Campus::create([
            'institution_id' => $this->institutionB->id,
            'name' => 'B-1', 'code' => 'B1', 'type' => CampusType::School->value,
        ]);
    }

    public function test_student_document_cannot_be_downloaded_from_another_campus(): void
    {
        $student = $this->student($this->campusA1);
        $document = $this->studentDocument($student);

        $outsider = $this->actor($this->campusA2, RoleName::CampusAdmin);

        $this->as($outsider)
            ->get("/api/v1/students/{$student->id}/documents/{$document->id}/download")
            ->assertNotFound();
    }

    public function test_student_document_cannot_be_downloaded_from_another_institution(): void
    {
        $student = $this->student($this->campusA1);
        $document = $this->studentDocument($student);

        $outsider = $this->actor($this->campusB1, RoleName::CampusAdmin);

        $this->as($outsider)
            ->get("/api/v1/students/{$student->id}/documents/{$document->id}/download")
            ->assertNotFound();
    }

    public function test_student_document_list_is_scoped_to_the_active_campus(): void
    {
        $ownStudent = $this->student($this->campusA1);
        $ownDocument = $this->studentDocument($ownStudent);

        $foreignStudent = $this->student($this->campusA2, 'ADM-FOREIGN');
        $this->studentDocument($foreignStudent);

        $admin = $this->actor($this->campusA1, RoleName::CampusAdmin);

        $ids = collect(
            $this->as($admin)
                ->getJson("/api/v1/students/{$ownStudent->id}/documents")
                ->assertOk()
                ->json('data')
        )->pluck('id');

        $this->assertTrue($ids->contains($ownDocument->id));

        $this->as($admin)
            ->getJson("/api/v1/students/{$foreignStudent->id}/documents")
            ->assertNotFound();
    }

    public function test_admission_document_cannot_be_downloaded_cross_tenant(): void
    {
        $admission = $this->admission($this->campusA1);
        $document = $this->admissionDocument($admission);

        $outsider = $this->actor($this->campusB1, RoleName::CampusAdmin);

        $this->as($outsider)
            ->get("/api/v1/admissions/{$admission->id}/documents/{$document->id}/download")
            ->assertNotFound();
    }

    public function test_staff_document_cannot_be_downloaded_cross_tenant(): void
    {
        $staff = $this->staff($this->campusA1);
        $document = $this->staffDocument($staff);

        $outsider = $this->actor($this->campusB1, RoleName::CampusAdmin);

        $this->as($outsider)
            ->get("/api/v1/staff/{$staff->id}/documents/{$document->id}/download")
            ->assertNotFound();
    }

    public function test_document_download_requires_authentication(): void
    {
        $student = $this->student($this->campusA1);
        $document = $this->studentDocument($student);

        $this->getJson("/api/v1/students/{$student->id}/documents/{$document->id}/download")
            ->assertUnauthorized();
    }

    private function student(Campus $campus, string $admissionNo = 'ADM-1'): Student
    {
        return Student::create([
            'institution_id' => $campus->institution_id,
            'campus_id' => $campus->id,
            'admission_no' => $admissionNo,
            'first_name' => 'Test', 'last_name' => 'Student',
            'gender' => 'male', 'status' => 'active',
        ]);
    }

    private function studentDocument(Student $student): StudentDocument
    {
        $path = "student-documents/{$student->id}/file.pdf";
        Storage::disk('local')->put($path, 'document-bytes');

        return $student->documents()->create([
            'institution_id' => $student->institution_id,
            'campus_id' => $student->campus_id,
            'type' => 'other',
            'title' => 'Document',
            'file_path' => $path,
            'original_name' => 'file.pdf',
            'mime_type' => 'application/pdf',
            'size' => 14,
        ]);
    }

    private function admission(Campus $campus): Admission
    {
        return Admission::create([
            'institution_id' => $campus->institution_id,
            'campus_id' => $campus->id,
            'application_no' => 'APP-1',
            'first_name' => 'Test', 'last_name' => 'Applicant',
            'gender' => 'male', 'status' => 'applied', 'applied_on' => now()->toDateString(),
        ]);
    }

    private function admissionDocument(Admission $admission): AdmissionDocument
    {
        $path = "admission-documents/{$admission->id}/file.pdf";
        Storage::disk('local')->put($path, 'document-bytes');

        return $admission->documents()->create([
            'institution_id' => $admission->institution_id,
            'campus_id' => $admission->campus_id,
            'type' => 'birth_certificate',
            'title' => 'Document',
            'file_path' => $path,
            'original_name' => 'file.pdf',
            'mime_type' => 'application/pdf',
            'size' => 14,
        ]);
    }

    private function staff(Campus $campus): StaffMember
    {
        return StaffMember::create([
            'institution_id' => $campus->institution_id,
            'campus_id' => $campus->id,
            'employee_no' => 'EMP-1',
            'first_name' => 'Test', 'last_name' => 'Staff',
            'gender' => 'male', 'status' => 'active',
            'joining_date' => now()->toDateString(),
        ]);
    }

    private function staffDocument(StaffMember $staff): StaffDocument
    {
        $path = "staff-documents/{$staff->id}/file.pdf";
        Storage::disk('local')->put($path, 'document-bytes');

        return $staff->documents()->create([
            'institution_id' => $staff->institution_id,
            'campus_id' => $staff->campus_id,
            'type' => 'contract',
            'title' => 'Document',
            'file_path' => $path,
            'original_name' => 'file.pdf',
            'mime_type' => 'application/pdf',
            'size' => 14,
        ]);
    }

    private function actor(Campus $campus, RoleName $role): User
    {
        $user = User::factory()->create([
            'institution_id' => $campus->institution_id,
            'campus_id' => $campus->id,
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
