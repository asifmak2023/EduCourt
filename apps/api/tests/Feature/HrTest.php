<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Enums\StaffStatus;
use App\Models\Campus;
use App\Models\Institution;
use App\Models\StaffMember;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class HrTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private User $teacher;

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

        $this->admin = $this->actor(RoleName::CampusAdmin);
        $this->teacher = $this->actor(RoleName::Teacher);
    }

    public function test_department_and_designation_can_be_created(): void
    {
        $department = $this->as($this->admin)->postJson('/api/v1/departments', [
            'name' => 'Science', 'code' => 'SCI', 'description' => 'Science wing',
        ])->assertStatus(201)->json('data');

        $designation = $this->as($this->admin)->postJson('/api/v1/designations', [
            'name' => 'Senior Teacher', 'code' => 'ST', 'department_id' => $department['id'],
            'grade' => 'BPS-17',
            'job_description' => 'Teach senior science classes.',
            'responsibilities' => ['Prepare lesson plans', 'Assess students'],
        ])->assertStatus(201)
            ->assertJsonPath('data.job_description', 'Teach senior science classes.')
            ->assertJsonCount(2, 'data.responsibilities')
            ->json('data');

        $this->as($this->admin)
            ->getJson('/api/v1/designations?department_id='.$department['id'])
            ->assertOk()
            ->assertJsonPath('data.0.id', $designation['id']);
    }

    public function test_staff_member_is_created_with_an_auto_employee_number(): void
    {
        $user = $this->actor(RoleName::Teacher);

        $staff = $this->as($this->admin)->postJson('/api/v1/staff', [
            'user_id' => $user->id,
            'first_name' => 'Ayesha', 'last_name' => 'Malik',
            'gender' => 'female', 'joining_date' => '2026-09-01',
            'employment_type' => 'permanent', 'phone' => '0300-1234567',
        ])->assertStatus(201)
            ->assertJsonPath('data.employee_no', 'EMP-0001')
            ->assertJsonPath('data.status', StaffStatus::Active->value)
            ->json('data');

        $this->assertDatabaseHas('staff_members', [
            'id' => $staff['id'],
            'user_id' => $user->id,
        ]);
    }

    public function test_staff_document_can_be_uploaded_verified_and_downloaded(): void
    {
        $staff = $this->makeStaff();

        $file = UploadedFile::fake()->create('contract.pdf', 60, 'application/pdf');

        $this->as($this->admin)->post("/api/v1/staff/{$staff->id}/documents", [
            'type' => 'contract',
            'title' => 'Employment Contract',
            'file' => $file,
        ], ['Accept' => 'application/json'])->assertStatus(201);

        $document = $staff->documents()->firstOrFail();

        $this->as($this->admin)
            ->getJson("/api/v1/staff/{$staff->id}/documents")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->as($this->admin)
            ->postJson("/api/v1/staff/{$staff->id}/documents/{$document->id}/verify")
            ->assertOk()
            ->assertJsonPath('data.is_verified', true);

        $this->as($this->admin)
            ->get("/api/v1/staff/{$staff->id}/documents/{$document->id}/download")
            ->assertOk();
    }

    public function test_terminating_staff_records_leaving_date_and_status(): void
    {
        $staff = $this->makeStaff();

        $this->as($this->admin)->postJson("/api/v1/staff/{$staff->id}/terminate", [
            'leaving_date' => '2026-12-31',
            'status' => 'resigned',
            'reason' => 'Relocating',
        ])->assertOk()
            ->assertJsonPath('data.status', StaffStatus::Resigned->value)
            ->assertJsonPath('data.leaving_date', '2026-12-31');
    }

    public function test_headcount_and_movement_reports(): void
    {
        $this->makeStaff('Hamza', 'Iqbal', '2026-09-01');

        $leaver = $this->makeStaff('Zara', 'Sheikh', '2026-01-01');
        $leaver->update(['status' => StaffStatus::Resigned, 'leaving_date' => '2026-09-15']);

        $headcount = $this->as($this->admin)
            ->getJson('/api/v1/staff-reports/headcount?as_on=2026-09-30')
            ->assertOk()
            ->json('data');

        $this->assertSame(1, $headcount['total']);

        $movement = $this->as($this->admin)
            ->getJson('/api/v1/staff-reports/joiners-leavers?from=2026-09-01&to=2026-09-30')
            ->assertOk()
            ->json('data');

        $this->assertCount(1, $movement['joiners']);
        $this->assertCount(1, $movement['leavers']);
    }

    public function test_teacher_cannot_manage_staff(): void
    {
        $this->as($this->teacher)
            ->getJson('/api/v1/staff')
            ->assertStatus(403);

        $this->as($this->teacher)
            ->postJson('/api/v1/departments', ['name' => 'Arts', 'code' => 'ART'])
            ->assertStatus(403);
    }

    private function makeStaff(string $first = 'Ayesha', string $last = 'Malik', string $joining = '2026-09-01'): StaffMember
    {
        return StaffMember::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'employee_no' => 'EMP-'.str_pad((string) (StaffMember::count() + 1), 4, '0', STR_PAD_LEFT),
            'first_name' => $first, 'last_name' => $last,
            'joining_date' => $joining, 'status' => StaffStatus::Active->value,
            'employment_type' => 'permanent',
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
        $this->withToken($user->createToken('t')->plainTextToken);

        return $this;
    }
}
