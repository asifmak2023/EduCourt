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

class UserPhotoTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private User $staff;

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

        $this->staff = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $this->staff->syncRoles([RoleName::Librarian->value]);
    }

    public function test_a_photo_can_be_uploaded_and_removed(): void
    {
        $this->as($this->admin)
            ->post("/api/v1/users/{$this->staff->id}/photo", [
                'photo' => UploadedFile::fake()->image('user.jpg', 200, 200),
            ])
            ->assertOk()
            ->assertJsonPath('data.photo_url', fn ($value) => is_string($value) && $value !== '');

        $path = $this->staff->refresh()->photo_path;

        $this->assertNotNull($path);
        Storage::disk('public')->assertExists($path);

        $this->as($this->admin)
            ->deleteJson("/api/v1/users/{$this->staff->id}/photo")
            ->assertOk();

        $this->assertNull($this->staff->refresh()->photo_path);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_replacing_a_photo_deletes_the_previous_file(): void
    {
        $this->upload();

        $first = $this->staff->refresh()->photo_path;

        $this->upload();

        $second = $this->staff->refresh()->photo_path;

        $this->assertNotSame($first, $second);
        Storage::disk('public')->assertMissing($first);
        Storage::disk('public')->assertExists($second);
    }

    public function test_a_non_image_file_is_rejected(): void
    {
        $this->as($this->admin)
            ->post("/api/v1/users/{$this->staff->id}/photo", [
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
            ->post("/api/v1/users/{$this->staff->id}/photo", [
                'photo' => UploadedFile::fake()->image('user.jpg'),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('photo');

        $this->assertNull($this->staff->refresh()->photo_path);
    }

    public function test_an_it_administrator_can_manage_a_photo(): void
    {
        $it = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $it->syncRoles([RoleName::ItAdministrator->value]);

        $this->as($it)
            ->post("/api/v1/users/{$this->staff->id}/photo", [
                'photo' => UploadedFile::fake()->image('user.jpg'),
            ])
            ->assertOk();

        $this->assertNotNull($this->staff->refresh()->photo_path);
    }

    public function test_a_teacher_cannot_manage_a_photo(): void
    {
        $teacher = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $teacher->syncRoles([RoleName::Teacher->value]);

        $this->as($teacher)
            ->post("/api/v1/users/{$this->staff->id}/photo", [
                'photo' => UploadedFile::fake()->image('user.jpg'),
            ])
            ->assertStatus(403);

        $this->as($teacher)
            ->deleteJson("/api/v1/users/{$this->staff->id}/photo")
            ->assertStatus(403);
    }

    public function test_uploading_a_photo_for_a_student_user_syncs_the_student_record(): void
    {
        $user = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $user->syncRoles([RoleName::Student->value]);

        $student = Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'user_id' => $user->id,
            'admission_no' => 'ADM-9',
            'first_name' => 'Sara', 'last_name' => 'Khan',
            'gender' => 'female', 'status' => 'active',
        ]);

        $this->as($this->admin)
            ->post("/api/v1/users/{$user->id}/photo", [
                'photo' => UploadedFile::fake()->image('student.jpg'),
            ])
            ->assertOk();

        $this->assertNotNull($student->refresh()->photo_path);
        $this->assertSame($user->refresh()->photo_path, $student->photo_path);
        Storage::disk('public')->assertExists($student->photo_path);

        $this->as($this->admin)
            ->getJson("/api/v1/students/{$student->id}")
            ->assertOk()
            ->assertJsonPath('data.photo_url', fn ($value) => is_string($value) && str_contains($value, $student->photo_path));

        $this->as($user)
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.photo_url', fn ($value) => is_string($value) && str_contains($value, $student->photo_path));
    }

    public function test_a_user_can_manage_their_own_photo(): void
    {
        $this->as($this->staff)
            ->post('/api/v1/auth/photo', [
                'photo' => UploadedFile::fake()->image('me.jpg', 200, 200),
            ])
            ->assertOk()
            ->assertJsonPath('data.photo_url', fn ($value) => is_string($value) && $value !== '');

        $path = $this->staff->refresh()->photo_path;

        $this->assertNotNull($path);
        Storage::disk('public')->assertExists($path);

        $this->as($this->staff)
            ->deleteJson('/api/v1/auth/photo')
            ->assertOk();

        $this->assertNull($this->staff->refresh()->photo_path);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_a_user_own_photo_must_be_an_image(): void
    {
        $this->as($this->staff)
            ->post('/api/v1/auth/photo', [
                'photo' => UploadedFile::fake()->create('notes.txt', 10, 'text/plain'),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('photo');
    }

    public function test_a_student_own_photo_syncs_the_student_record(): void
    {
        $user = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $user->syncRoles([RoleName::Student->value]);

        $student = Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'user_id' => $user->id,
            'admission_no' => 'ADM-SELF',
            'first_name' => 'Sara', 'last_name' => 'Khan',
            'gender' => 'female', 'status' => 'active',
        ]);

        $this->as($user)
            ->post('/api/v1/auth/photo', [
                'photo' => UploadedFile::fake()->image('me.jpg'),
            ])
            ->assertOk();

        $this->assertNotNull($user->refresh()->photo_path);
        $this->assertSame($user->photo_path, $student->refresh()->photo_path);
        Storage::disk('public')->assertExists($student->photo_path);
    }

    private function upload(): void
    {
        $this->as($this->admin)
            ->post("/api/v1/users/{$this->staff->id}/photo", [
                'photo' => UploadedFile::fake()->image('user.jpg'),
            ])
            ->assertOk();
    }

    private function as(User $user): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('t')->plainTextToken);
    }
}
