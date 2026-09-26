<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\Campus;
use App\Models\Institution;
use App\Models\Student;
use App\Models\User;
use App\Services\Files\FileScanner;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StudentDocumentTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private Student $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);
        Storage::fake('local');

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

        $this->student = Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'admission_no' => 'ADM-1',
            'first_name' => 'Ali', 'last_name' => 'Raza',
            'gender' => 'male', 'status' => 'active',
        ]);
    }

    public function test_a_document_can_be_uploaded_listed_and_downloaded(): void
    {
        $file = UploadedFile::fake()->create('birth-certificate.pdf', 50, 'application/pdf');

        $this->as($this->admin)->postJson("/api/v1/students/{$this->student->id}/documents", [
            'type' => 'birth_certificate',
            'file' => $file,
        ])->assertStatus(201)
            ->assertJsonPath('data.type', 'birth_certificate')
            ->assertJsonPath('data.is_verified', false);

        $this->as($this->admin)->getJson("/api/v1/students/{$this->student->id}/documents")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $document = $this->student->documents()->firstOrFail();

        $this->as($this->admin)
            ->get("/api/v1/students/{$this->student->id}/documents/{$document->id}/download")
            ->assertOk();
    }

    public function test_a_document_can_be_verified(): void
    {
        $this->upload();

        $document = $this->student->documents()->firstOrFail();

        $this->as($this->admin)->postJson("/api/v1/students/{$this->student->id}/documents/{$document->id}/verify")
            ->assertOk()
            ->assertJsonPath('data.is_verified', true);

        $this->assertNotNull($document->refresh()->verified_at);
    }

    public function test_an_infected_file_is_rejected_by_the_scanner(): void
    {
        $this->app->instance(FileScanner::class, new class implements FileScanner
        {
            public function scan(string $absolutePath): ?string
            {
                return 'Eicar-Test-Signature';
            }
        });

        $file = UploadedFile::fake()->create('malware.pdf', 10, 'application/pdf');

        $this->as($this->admin)->postJson("/api/v1/students/{$this->student->id}/documents", [
            'type' => 'other',
            'file' => $file,
        ])->assertStatus(422)
            ->assertJsonValidationErrors('file');

        $this->assertDatabaseCount('student_documents', 0);
    }

    public function test_a_teacher_cannot_upload_documents(): void
    {
        $teacher = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $teacher->syncRoles([RoleName::Teacher->value]);

        $file = UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf');

        $this->as($teacher)->postJson("/api/v1/students/{$this->student->id}/documents", [
            'type' => 'other',
            'file' => $file,
        ])->assertStatus(403);
    }

    private function upload(): void
    {
        $file = UploadedFile::fake()->create('report.pdf', 50, 'application/pdf');

        $this->as($this->admin)->postJson("/api/v1/students/{$this->student->id}/documents", [
            'type' => 'previous_report',
            'file' => $file,
        ])->assertStatus(201);
    }

    private function as(User $user): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('t')->plainTextToken);
    }
}
