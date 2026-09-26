<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\FineCategory;
use App\Enums\RoleName;
use App\Enums\VoucherStatus;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ChartOfAccount;
use App\Models\ClassRoom;
use App\Models\FeeHead;
use App\Models\FeePlan;
use App\Models\FeeVoucher;
use App\Models\FineRule;
use App\Models\FiscalYear;
use App\Models\Institution;
use App\Models\JournalLine;
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

class FineTest extends TestCase
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

    private FineRule $rule;

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

        $this->rule = $this->fineRule();
        $this->voucher = $this->issuedVoucher();
    }

    public function test_fine_rule_can_be_created_and_listed(): void
    {
        $this->as($this->admin)->postJson('/api/v1/fine-rules', [
            'name' => 'Library Late Return',
            'code' => 'LIB10',
            'category' => FineCategory::Library->value,
            'amount' => 1000,
            'fee_head_id' => $this->rule->fee_head_id,
        ])->assertStatus(201)->assertJsonPath('data.code', 'LIB10');

        $this->as($this->admin)->getJson('/api/v1/fine-rules')
            ->assertOk()
            ->assertJsonFragment(['code' => 'LIB10']);
    }

    public function test_pending_fine_can_be_applied_to_an_outstanding_voucher(): void
    {
        $fineId = $this->createFine();

        $this->as($this->admin)->postJson("/api/v1/fines/{$fineId}/apply")
            ->assertOk()
            ->assertJsonPath('data.status', 'applied');

        $voucher = $this->voucher->refresh();

        $this->assertSame('30500.00', (string) $voucher->amount);
        $this->assertSame(VoucherStatus::Unpaid, $voucher->status);

        $this->assertSame(500.0, (float) JournalLine::query()
            ->where('chart_of_account_id', $this->accounts->get('4040')->id)
            ->sum('credit'));

        $this->assertSame(30500.0, (float) JournalLine::query()
            ->where('chart_of_account_id', $this->accounts->get('1110')->id)
            ->sum('debit'));

        $this->assertDatabaseHas('fee_voucher_lines', [
            'fee_voucher_id' => $voucher->id,
            'fee_head_id' => $this->rule->fee_head_id,
            'amount' => 500,
        ]);
    }

    public function test_fine_cannot_be_applied_without_an_outstanding_voucher(): void
    {
        $other = Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'admission_no' => 'ADM-2',
            'first_name' => 'Sara', 'last_name' => 'Khan',
            'gender' => 'female', 'status' => 'active',
        ]);

        $fineId = $this->createFine($other);

        $this->as($this->admin)->postJson("/api/v1/fines/{$fineId}/apply")
            ->assertStatus(422)
            ->assertJsonValidationErrors('fee_voucher_id');
    }

    public function test_pending_fine_can_be_waived_without_posting(): void
    {
        $fineId = $this->createFine();

        $this->as($this->admin)->postJson("/api/v1/fines/{$fineId}/waive", [
            'waived_reason' => 'First-time offence.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'waived')
            ->assertJsonPath('data.waived_reason', 'First-time offence.');

        $this->assertSame('30000.00', (string) $this->voucher->refresh()->amount);
        $this->assertSame(0.0, (float) JournalLine::query()
            ->where('chart_of_account_id', $this->accounts->get('4040')->id)
            ->sum('credit'));
    }

    public function test_applied_fine_can_be_revoked_reversing_the_ledger(): void
    {
        $fineId = $this->createFine();

        $this->as($this->admin)->postJson("/api/v1/fines/{$fineId}/apply")->assertOk();
        $this->assertSame('30500.00', (string) $this->voucher->refresh()->amount);

        $this->as($this->admin)->postJson("/api/v1/fines/{$fineId}/revoke", [
            'reason' => 'Issued by mistake.',
        ])->assertOk()->assertJsonPath('data.status', 'revoked');

        $voucher = $this->voucher->refresh();

        $this->assertSame('30000.00', (string) $voucher->amount);
        $this->assertDatabaseMissing('fee_voucher_lines', [
            'fee_voucher_id' => $voucher->id,
            'fee_head_id' => $this->rule->fee_head_id,
        ]);

        $this->assertSame(500.0, (float) JournalLine::query()
            ->where('chart_of_account_id', $this->accounts->get('4040')->id)
            ->sum('debit'));
    }

    public function test_teacher_cannot_manage_fines(): void
    {
        $teacher = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $teacher->syncRoles([RoleName::Teacher->value]);

        $this->as($teacher)->postJson('/api/v1/fine-rules', [
            'name' => 'X', 'code' => 'X', 'amount' => 1,
            'fee_head_id' => $this->rule->fee_head_id,
        ])->assertStatus(403);

        $this->as($teacher)->postJson('/api/v1/fines', [
            'student_id' => $this->student->id,
            'amount' => 100,
            'issued_on' => '2026-07-20',
        ])->assertStatus(403);
    }

    private function createFine(?Student $student = null): int
    {
        return $this->as($this->admin)->postJson('/api/v1/fines', [
            'student_id' => ($student ?? $this->student)->id,
            'fine_rule_id' => $this->rule->id,
            'academic_year_id' => $this->year->id,
            'issued_on' => '2026-07-20',
        ])->assertStatus(201)
            ->assertJsonPath('data.status', 'pending')
            ->json('data.id');
    }

    private function fineRule(): FineRule
    {
        $head = FeeHead::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'code' => 'FINE', 'name' => 'Fines and Penalties',
            'income_account_id' => $this->accounts->get('4040')->id,
        ]);

        return FineRule::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'fee_head_id' => $head->id,
            'name' => 'Library Late Return',
            'code' => 'LIB',
            'category' => FineCategory::Library,
            'amount' => 500,
            'is_active' => true,
        ]);
    }

    private function issuedVoucher(): FeeVoucher
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
                ['label' => 'Only', 'due_date' => '2026-07-10', 'percentage' => 100],
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
