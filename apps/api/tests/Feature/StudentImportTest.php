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
use App\Models\StudentEnrollment;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class StudentImportTest extends TestCase
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
            'name' => '2026-2027', 'code' => 'AY1',
            'starts_on' => '2026-04-01', 'ends_on' => '2027-03-31', 'status' => 'active',
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

    public function test_a_valid_csv_creates_students_guardians_and_enrollments(): void
    {
        $response = $this->as($this->admin)->postJson('/api/v1/students/import', [
            'file' => $this->csv([
                ['Ali', 'Raza', 'male', '', '2015-04-12', '', '', '', '', '', 'ali@example.test', '', '', '', '', '', 'active', 'Imran Raza', 'father', 'imran@example.test', '+92-300-1', 'yes', '2026-2027', 'Class 1', 'A'],
                ['Sara', 'Khan', 'female', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
            ]),
        ])->assertStatus(201)
            ->assertJsonPath('created', 2)
            ->assertJsonPath('skipped', 0);

        $response->assertJsonPath('valid', 2);

        $this->assertSame(2, Student::query()->count());
        $this->assertSame(1, Guardian::query()->count());
        $this->assertSame(1, StudentEnrollment::query()->count());

        $ali = Student::query()->where('first_name', 'Ali')->firstOrFail();
        $this->assertSame('ali@example.test', $ali->email);
        $this->assertStringStartsWith('ADM-', $ali->admission_no);
        $this->assertCount(1, $ali->guardians);
        $this->assertCount(1, $ali->enrollments);
        $this->assertSame($this->class->id, $ali->enrollments->first()->class_room_id);
        $this->assertSame($this->section->id, $ali->enrollments->first()->section_id);
    }

    public function test_a_dry_run_previews_rows_without_writing(): void
    {
        $this->as($this->admin)->postJson('/api/v1/students/import', [
            'file' => $this->csv([
                ['Ali', 'Raza', 'male', '', '', '', '', '', '', '', '', '', '', '', '', '', 'active', '', '', '', '', '', '', '', ''],
            ]),
            'dry_run' => true,
        ])->assertStatus(200)
            ->assertJsonPath('dry_run', true)
            ->assertJsonPath('valid', 1)
            ->assertJsonPath('created', 0);

        $this->assertSame(0, Student::query()->count());
    }

    public function test_invalid_rows_are_reported_with_line_numbers(): void
    {
        $response = $this->as($this->admin)->postJson('/api/v1/students/import/preview', [
            'file' => $this->csv([
                ['Ali', 'Raza', 'male', '', '', '', '', '', '', '', '', '', '', '', '', '', 'active', '', '', '', '', '', '', '', ''],
                ['', 'Khan', 'female', '', '', '', '', '', '', '', '', '', '', '', '', '', 'active', '', '', '', '', '', '', '', ''],
                ['Bad', 'Gender', 'unknown', '', '', '', '', '', '', '', '', '', '', '', '', '', 'active', '', '', '', '', '', '', '', ''],
            ]),
        ])->assertStatus(200)
            ->assertJsonPath('rows', 3)
            ->assertJsonPath('valid', 1)
            ->assertJsonPath('skipped', 2);

        $errors = $response->json('errors');
        $this->assertCount(2, $errors);
        $this->assertSame(3, $errors[0]['line']);
        $this->assertSame(4, $errors[1]['line']);
    }

    public function test_import_fails_without_skip_invalid_when_rows_are_invalid(): void
    {
        $this->as($this->admin)->postJson('/api/v1/students/import', [
            'file' => $this->csv([
                ['Ali', 'Raza', 'male', '', '', '', '', '', '', '', '', '', '', '', '', '', 'active', '', '', '', '', '', '', '', ''],
                ['', '', 'male', '', '', '', '', '', '', '', '', '', '', '', '', '', 'active', '', '', '', '', '', '', '', ''],
            ]),
        ])->assertStatus(422);

        $this->assertSame(0, Student::query()->count());
    }

    public function test_skip_invalid_imports_only_the_valid_rows(): void
    {
        $this->as($this->admin)->postJson('/api/v1/students/import', [
            'file' => $this->csv([
                ['Ali', 'Raza', 'male', '', '', '', '', '', '', '', '', '', '', '', '', '', 'active', '', '', '', '', '', '', '', ''],
                ['', '', 'male', '', '', '', '', '', '', '', '', '', '', '', '', '', 'active', '', '', '', '', '', '', '', ''],
            ]),
            'skip_invalid' => true,
        ])->assertStatus(201)
            ->assertJsonPath('created', 1)
            ->assertJsonPath('skipped', 1);

        $this->assertSame(1, Student::query()->count());
    }

    public function test_duplicate_admission_numbers_are_rejected(): void
    {
        $this->student('ADM-100');

        $response = $this->as($this->admin)->postJson('/api/v1/students/import/preview', [
            'file' => $this->csv([
                ['Ali', 'Raza', 'male', 'ADM-100', '', '', '', '', '', '', '', '', '', '', '', '', 'active', '', '', '', '', '', '', '', ''],
            ]),
        ])->assertStatus(200)
            ->assertJsonPath('valid', 0);

        $this->assertStringContainsString('already exists', $response->json('errors.0.message'));
    }

    public function test_duplicate_admission_numbers_within_the_file_are_rejected(): void
    {
        $response = $this->as($this->admin)->postJson('/api/v1/students/import/preview', [
            'file' => $this->csv([
                ['Ali', 'Raza', 'male', 'ADM-500', '', '', '', '', '', '', '', '', '', '', '', '', 'active', '', '', '', '', '', '', '', ''],
                ['Sara', 'Khan', 'female', 'ADM-500', '', '', '', '', '', '', '', '', '', '', '', '', 'active', '', '', '', '', '', '', '', ''],
            ]),
        ])->assertStatus(200)
            ->assertJsonPath('valid', 1)
            ->assertJsonPath('skipped', 1);

        $this->assertStringContainsString('duplicated in this file', $response->json('errors.0.message'));
    }

    public function test_unknown_class_is_rejected(): void
    {
        $response = $this->as($this->admin)->postJson('/api/v1/students/import/preview', [
            'file' => $this->csv([
                ['Ali', 'Raza', 'male', '', '', '', '', '', '', '', '', '', '', '', '', '', 'active', '', '', '', '', '', '2026-2027', 'Class 99', ''],
            ]),
        ])->assertStatus(200)
            ->assertJsonPath('valid', 0);

        $this->assertStringContainsString('Class "Class 99"', $response->json('errors.0.message'));
    }

    public function test_a_missing_required_column_is_rejected(): void
    {
        $this->as($this->admin)->postJson('/api/v1/students/import/preview', [
            'file' => $this->csv([
                ['Ali', 'male'],
            ], ['first_name', 'gender']),
        ])->assertStatus(422)
            ->assertJsonValidationErrors('file');
    }

    public function test_the_template_can_be_downloaded(): void
    {
        $response = $this->as($this->admin)->get('/api/v1/students/import/template')
            ->assertOk();

        $response->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('first_name', $response->streamedContent());
        $this->assertStringContainsString('guardian_name', $response->streamedContent());
    }

    public function test_a_teacher_cannot_import_students(): void
    {
        $this->as($this->teacher)->postJson('/api/v1/students/import', [
            'file' => $this->csv([
                ['Ali', 'Raza', 'male', '', '', '', '', '', '', '', '', '', '', '', '', '', 'active', '', '', '', '', '', '', '', ''],
            ]),
        ])->assertStatus(403);
    }

    public function test_a_non_csv_upload_is_rejected(): void
    {
        $this->as($this->admin)->postJson('/api/v1/students/import', [
            'file' => UploadedFile::fake()->create('students.pdf', 10, 'application/pdf'),
        ])->assertStatus(422)->assertJsonValidationErrors('file');
    }

    /**
     * @param  list<list<string>>  $rows
     * @param  list<string>|null  $headers
     */
    private function csv(array $rows, ?array $headers = null): UploadedFile
    {
        $headers ??= [
            'first_name', 'last_name', 'gender', 'admission_no', 'date_of_birth',
            'blood_group', 'nationality', 'religion', 'category', 'national_id',
            'email', 'phone', 'address', 'city', 'previous_school', 'admission_date',
            'status', 'guardian_name', 'guardian_relationship', 'guardian_email',
            'guardian_phone', 'guardian_is_primary', 'academic_year', 'class', 'section',
        ];

        $handle = fopen('php://temp', 'r+b');
        fputcsv($handle, $headers);
        foreach ($rows as $row) {
            fputcsv($handle, $row);
        }
        rewind($handle);
        $contents = stream_get_contents($handle);
        fclose($handle);

        return UploadedFile::fake()->createWithContent('students.csv', $contents);
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

    private function student(string $admissionNo): Student
    {
        return Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'admission_no' => $admissionNo,
            'first_name' => 'Existing',
            'last_name' => 'Student',
            'gender' => 'male',
        ]);
    }
}
