<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ChartOfAccount;
use App\Models\ClassRoom;
use App\Models\FeeHead;
use App\Models\FeePlan;
use App\Models\FeeReminder;
use App\Models\FeeVoucher;
use App\Models\FiscalYear;
use App\Models\Guardian;
use App\Models\Institution;
use App\Models\Section;
use App\Models\Stage;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\User;
use App\Services\Accounting\DefaultChartOfAccounts;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Tests\TestCase;

class FeeReminderTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private AcademicYear $year;

    private ClassRoom $class;

    /** @var Collection<string, ChartOfAccount> */
    private Collection $accounts;

    private Student $student;

    private FeeVoucher $voucher;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

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

        $this->year = AcademicYear::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => '2026-2027', 'code' => 'AY',
            'starts_on' => '2026-04-01', 'ends_on' => '2027-03-31',
            'status' => 'active', 'is_current' => true,
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

        $section = Section::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'class_room_id' => $this->class->id, 'name' => 'A',
        ]);

        FiscalYear::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'FY 2026-2027', 'code' => 'FY27',
            'starts_on' => '2026-07-01', 'ends_on' => '2027-06-30',
            'status' => 'open', 'is_current' => true,
        ]);

        $this->accounts = app(DefaultChartOfAccounts::class)->seed($this->campus);

        $this->student = Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'admission_no' => 'ADM-1',
            'first_name' => 'Ali', 'last_name' => 'Raza',
            'gender' => 'male', 'status' => 'active',
        ]);

        StudentEnrollment::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $this->student->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'section_id' => $section->id,
            'status' => 'active',
        ]);

        $guardian = Guardian::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Imran Raza',
            'email' => 'imran@example.test',
            'phone' => '+92-300-0000001',
        ]);

        $this->student->guardians()->attach($guardian->id, [
            'relationship' => 'father', 'is_primary' => true,
        ]);

        $this->voucher = $this->issuedVoucher('2026-07-10');
    }

    public function test_reminders_can_be_generated_for_overdue_defaulters(): void
    {
        $response = $this->as($this->admin)->postJson('/api/v1/fee-reminders', [
            'academic_year_id' => $this->year->id,
            'as_of' => '2026-09-26',
            'channel' => 'email',
        ])->assertStatus(201)
            ->assertJsonPath('created', 1)
            ->assertJsonPath('data.0.status', 'pending')
            ->assertJsonPath('data.0.recipient_email', 'imran@example.test')
            ->assertJsonPath('data.0.guardian', 'Imran Raza');

        $this->assertStringContainsString('Ali Raza', $response->json('data.0.message'));
        $this->assertSame('30000.00', $response->json('data.0.outstanding'));

        $this->assertDatabaseHas('fee_reminders', [
            'student_id' => $this->student->id,
            'status' => 'pending',
        ]);
    }

    public function test_a_pending_reminder_can_be_sent(): void
    {
        $id = $this->generateReminder();

        $this->as($this->admin)->postJson("/api/v1/fee-reminders/{$id}/send")
            ->assertOk()
            ->assertJsonPath('data.status', 'sent');

        $reminder = FeeReminder::query()->findOrFail($id);

        $this->assertNotNull($reminder->sent_at);
    }

    public function test_generation_is_idempotent_within_the_same_day(): void
    {
        $this->generateReminder();

        $this->as($this->admin)->postJson('/api/v1/fee-reminders', [
            'academic_year_id' => $this->year->id,
            'as_of' => '2026-09-26',
        ])->assertStatus(201)
            ->assertJsonPath('created', 0)
            ->assertJsonPath('skipped', 1);

        $this->assertSame(1, FeeReminder::query()->count());
    }

    public function test_force_regenerates_a_reminder(): void
    {
        $this->generateReminder();

        $this->as($this->admin)->postJson('/api/v1/fee-reminders', [
            'academic_year_id' => $this->year->id,
            'as_of' => '2026-09-26',
            'force' => true,
        ])->assertStatus(201)
            ->assertJsonPath('created', 1);

        $this->assertSame(2, FeeReminder::query()->count());
    }

    public function test_a_current_voucher_is_not_treated_as_a_defaulter(): void
    {
        $this->voucher->update(['due_date' => '2026-12-31']);

        $this->as($this->admin)->postJson('/api/v1/fee-reminders', [
            'academic_year_id' => $this->year->id,
            'as_of' => '2026-09-26',
        ])->assertStatus(201)
            ->assertJsonPath('created', 0);

        $this->assertSame(0, FeeReminder::query()->count());
    }

    public function test_a_pending_reminder_can_be_cancelled(): void
    {
        $id = $this->generateReminder();

        $this->as($this->admin)->postJson("/api/v1/fee-reminders/{$id}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');
    }

    public function test_teacher_cannot_manage_reminders(): void
    {
        $teacher = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $teacher->syncRoles([RoleName::Teacher->value]);

        $this->as($teacher)->getJson('/api/v1/fee-reminders')->assertStatus(403);

        $this->as($teacher)->postJson('/api/v1/fee-reminders', [
            'academic_year_id' => $this->year->id,
        ])->assertStatus(403);
    }

    private function generateReminder(): int
    {
        return $this->as($this->admin)->postJson('/api/v1/fee-reminders', [
            'academic_year_id' => $this->year->id,
            'as_of' => '2026-09-26',
            'channel' => 'email',
        ])->assertStatus(201)->json('data.0.id');
    }

    private function issuedVoucher(string $dueDate): FeeVoucher
    {
        $tuition = FeeHead::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'code' => 'TUI', 'name' => 'Tuition',
            'income_account_id' => $this->accounts->get('4010')->id,
        ]);

        $planResponse = $this->as($this->admin)->postJson('/api/v1/fee-plans', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'name' => 'Standard Fee',
            'items' => [['fee_head_id' => $tuition->id, 'amount' => 30000]],
            'installments' => [
                ['label' => 'Only', 'due_date' => $dueDate, 'percentage' => 100],
            ],
        ])->assertStatus(201);

        $plan = FeePlan::query()->findOrFail($planResponse->json('data.id'));

        $this->as($this->admin)->postJson('/api/v1/fee-vouchers/generate', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'fee_plan_id' => $plan->id,
        ])->assertStatus(201);

        return FeeVoucher::query()->where('student_id', $this->student->id)->firstOrFail();
    }

    private function as(User $user): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('t')->plainTextToken);
    }
}
