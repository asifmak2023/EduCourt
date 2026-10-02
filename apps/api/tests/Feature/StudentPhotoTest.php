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

class StudentPhotoTest extends TestCase
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
        Storage::fake('public');

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

    public function test_a_photo_can_be_uploaded_and_removed(): void
    {
        $this->as($this->admin)
            ->post("/api/v1/students/{$this->student->id}/photo", [
                'photo' => UploadedFile::fake()->image('student.jpg', 200, 200),
            ])
            ->assertOk()
            ->assertJsonPath('data.photo_path', fn ($value) => is_string($value) && $value !== '');

        $path = $this->student->refresh()->photo_path;

        $this->assertNotNull($path);
        Storage::disk('public')->assertExists($path);

        $this->as($this->admin)
            ->deleteJson("/api/v1/students/{$this->student->id}/photo")
            ->assertOk();

        $this->assertNull($this->student->refresh()->photo_path);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_replacing_a_photo_deletes_the_previous_file(): void
    {
        $this->upload();

        $first = $this->student->refresh()->photo_path;

        $this->upload();

        $second = $this->student->refresh()->photo_path;

        $this->assertNotSame($first, $second);
        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($second);
    }

    public function test_a_non_image_file_is_rejected(): void
    {
        $this->as($this->admin)
            ->post("/api/v1/students/{$this->student->id}/photo", [
                'photo' => UploadedFile::fake()->create('notes.txt', 10, 'text/plain'),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('photo');
    }

    public function test_an_infected_photo_is_rejected_by_the_scanner(): void
    {
        $this->app->instance(FileScanner::class, new class implements FileScanner
        {
            public function scan(string $absolutePath): ?string
            {
                return 'Eicar-Test-Signature';
            }
        });

        $this->as($this->admin)
            ->post("/api/v1/students/{$this->student->id}/photo", [
                'photo' => UploadedFile::fake()->image('student.jpg'),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('photo');

        $this->assertNull($this->student->refresh()->photo_path);
    }

    public function test_an_admissions_officer_can_manage_a_photo(): void
    {
        $officer = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $officer->syncRoles([RoleName::AdmissionsOfficer->value]);

        $this->as($officer)
            ->post("/api/v1/students/{$this->student->id}/photo", [
                'photo' => UploadedFile::fake()->image('student.jpg'),
            ])
            ->assertOk();

        $this->assertNotNull($this->student->refresh()->photo_path);
    }

    public function test_a_principal_can_manage_a_photo(): void
    {
        $principal = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $principal->syncRoles([RoleName::Principal->value]);

        $this->as($principal)
            ->post("/api/v1/students/{$this->student->id}/photo", [
                'photo' => UploadedFile::fake()->image('student.jpg'),
            ])
            ->assertOk();
    }

    public function test_a_teacher_cannot_manage_a_photo(): void
    {
        $teacher = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $teacher->syncRoles([RoleName::Teacher->value]);

        $this->as($teacher)
            ->post("/api/v1/students/{$this->student->id}/photo", [
                'photo' => UploadedFile::fake()->image('student.jpg'),
            ])
            ->assertStatus(403);

        $this->as($teacher)
            ->deleteJson("/api/v1/students/{$this->student->id}/photo")
            ->assertStatus(403);
    }

    public function test_the_logged_in_student_sees_their_own_photo(): void
    {
        $user = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $user->syncRoles([RoleName::Student->value]);

        $path = "student-photos/{$this->student->id}/self.jpg";
        Storage::disk('public')->put($path, 'image-bytes');

        $this->student->update(['user_id' => $user->id, 'photo_path' => $path]);

        $this->as($user)
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.photo_url', fn ($value) => is_string($value) && str_contains($value, $path));
    }

    private function upload(): void
    {
        $this->as($this->admin)
            ->post("/api/v1/students/{$this->student->id}/photo", [
                'photo' => UploadedFile::fake()->image('student.jpg'),
            ])
            ->assertOk();
    }

    private function as(User $user): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('t')->plainTextToken);
    }
}
