<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Enums\VoucherStatus;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ChartOfAccount;
use App\Models\ClassRoom;
use App\Models\FeeHead;
use App\Models\FeePayment;
use App\Models\FeePlan;
use App\Models\FeeVoucher;
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

class FeeAdjustmentTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private User $teacher;

    private AcademicYear $year;

    private ClassRoom $class;

    private Section $section;

    /** @var Collection<string, ChartOfAccount> */
    private Collection $accounts;

    private Student $ali;

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
            'name' => '2026-2027', 'code' => 'AY',
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

        FiscalYear::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'FY 2026-2027', 'code' => 'FY27',
            'starts_on' => '2026-07-01', 'ends_on' => '2027-06-30',
            'status' => 'open', 'is_current' => true,
        ]);

        $this->accounts = app(DefaultChartOfAccounts::class)->seed($this->campus);

        $this->ali = $this->student('ADM-1', 'Ali', 'Raza');
        $this->enroll($this->ali);
    }

    public function test_late_fee_is_applied_and_posted(): void
    {
        $plan = $this->plan('flat', 500, 0);
        $voucher = $this->voucher($plan);

        $this->as($this->admin)
            ->postJson("/api/v1/fee-vouchers/{$voucher->id}/late-fee")
            ->assertOk()
            ->assertJsonPath('data.late_fee_amount', '500.00')
            ->assertJsonPath('data.amount', '12500.00');

        $voucher->refresh();
        $this->assertNotNull($voucher->late_fee_applied_at);

        $this->assertSame(500.0, (float) JournalLine::query()
            ->where('chart_of_account_id', $this->accounts->get('4050')->id)
            ->sum('credit'));

        $this->assertSame(30500.0, (float) JournalLine::query()
            ->where('chart_of_account_id', $this->accounts->get('1110')->id)
            ->sum('debit'));
    }

    public function test_late_fee_cannot_be_applied_twice_or_without_policy(): void
    {
        $plan = $this->plan('flat', 500, 0);
        $voucher = $this->voucher($plan);

        $this->as($this->admin)
            ->postJson("/api/v1/fee-vouchers/{$voucher->id}/late-fee")
            ->assertOk();

        $this->as($this->admin)
            ->postJson("/api/v1/fee-vouchers/{$voucher->id}/late-fee")
            ->assertStatus(422);

        $noPolicy = $this->plan('none', 0, 0, 'No Late Fee');
        $other = $this->voucher($noPolicy);

        $this->as($this->admin)
            ->postJson("/api/v1/fee-vouchers/{$other->id}/late-fee")
            ->assertStatus(422);
    }

    public function test_late_fee_respects_the_grace_period(): void
    {
        $plan = $this->plan('flat', 500, 3650);
        $voucher = $this->voucher($plan);

        $this->as($this->admin)
            ->postJson("/api/v1/fee-vouchers/{$voucher->id}/late-fee")
            ->assertStatus(422);
    }

    public function test_advance_payment_posts_to_the_advance_account_and_can_be_applied(): void
    {
        $plan = $this->plan('none', 0, 0);
        $voucher = $this->voucher($plan);

        $paymentId = $this->as($this->admin)->postJson('/api/v1/fee-payments', [
            'student_id' => $this->ali->id,
            'payment_date' => '2026-07-15',
            'amount' => 5000,
            'method' => 'cash',
        ])->assertStatus(201)->json('data.id');

        $this->assertSame(5000.0, (float) JournalLine::query()
            ->where('chart_of_account_id', $this->accounts->get('2030')->id)
            ->sum('credit'));

        $this->assertNull(FeePayment::query()->findOrFail($paymentId)->fee_voucher_id);

        $this->as($this->admin)
            ->postJson("/api/v1/fee-payments/{$paymentId}/apply", ['fee_voucher_id' => $voucher->id])
            ->assertOk()
            ->assertJsonPath('data.fee_voucher_id', $voucher->id);

        $this->assertSame(5000.0, (float) JournalLine::query()
            ->where('chart_of_account_id', $this->accounts->get('2030')->id)
            ->sum('debit'));

        $this->assertSame('5000.00', (string) $voucher->refresh()->paid_amount);
        $this->assertSame(VoucherStatus::Partial, $voucher->status);
    }

    public function test_refund_of_an_applied_payment_reopens_the_voucher(): void
    {
        $plan = $this->plan('none', 0, 0);
        $voucher = $this->voucher($plan);

        $paymentId = $this->as($this->admin)->postJson('/api/v1/fee-payments', [
            'student_id' => $this->ali->id,
            'fee_voucher_id' => $voucher->id,
            'payment_date' => '2026-07-15',
            'amount' => 12000,
            'method' => 'cash',
        ])->assertStatus(201)->json('data.id');

        $this->assertSame(VoucherStatus::Paid, $voucher->refresh()->status);

        $this->as($this->admin)->postJson('/api/v1/fee-refunds', [
            'fee_payment_id' => $paymentId,
            'refund_date' => '2026-07-20',
            'amount' => 2000,
            'method' => 'cash',
            'reason' => 'Partial refund',
        ])->assertStatus(201)->assertJsonPath('data.receipt_no', 'RF-000001');

        $voucher->refresh();
        $this->assertSame('10000.00', (string) $voucher->paid_amount);
        $this->assertSame(VoucherStatus::Partial, $voucher->status);

        $this->assertSame(2000.0, (float) JournalLine::query()
            ->where('chart_of_account_id', $this->accounts->get('1010')->id)
            ->sum('credit'));
    }

    public function test_refund_of_an_advance_posts_to_the_advance_account(): void
    {
        $plan = $this->plan('none', 0, 0);
        $this->voucher($plan);

        $paymentId = $this->as($this->admin)->postJson('/api/v1/fee-payments', [
            'student_id' => $this->ali->id,
            'payment_date' => '2026-07-15',
            'amount' => 5000,
            'method' => 'cash',
        ])->assertStatus(201)->json('data.id');

        $this->as($this->admin)->postJson('/api/v1/fee-refunds', [
            'fee_payment_id' => $paymentId,
            'refund_date' => '2026-07-20',
            'amount' => 5000,
            'method' => 'cash',
        ])->assertStatus(201);

        $this->assertSame(5000.0, (float) JournalLine::query()
            ->where('chart_of_account_id', $this->accounts->get('2030')->id)
            ->sum('debit'));
    }

    public function test_refund_cannot_exceed_the_remaining_payment_amount(): void
    {
        $plan = $this->plan('none', 0, 0);
        $this->voucher($plan);

        $paymentId = $this->as($this->admin)->postJson('/api/v1/fee-payments', [
            'student_id' => $this->ali->id,
            'payment_date' => '2026-07-15',
            'amount' => 5000,
            'method' => 'cash',
        ])->assertStatus(201)->json('data.id');

        $this->as($this->admin)->postJson('/api/v1/fee-refunds', [
            'fee_payment_id' => $paymentId,
            'refund_date' => '2026-07-20',
            'amount' => 6000,
            'method' => 'cash',
        ])->assertStatus(422)->assertJsonValidationErrors('amount');
    }

    public function test_teacher_cannot_apply_late_fees_or_issue_refunds(): void
    {
        $plan = $this->plan('flat', 500, 0);
        $voucher = $this->voucher($plan);

        $this->as($this->teacher)
            ->postJson("/api/v1/fee-vouchers/{$voucher->id}/late-fee")
            ->assertStatus(403);

        $this->as($this->teacher)
            ->postJson('/api/v1/fee-refunds', [
                'fee_payment_id' => 1,
                'refund_date' => '2026-07-20',
                'amount' => 100,
                'method' => 'cash',
            ])->assertStatus(403);
    }

    private function plan(string $lateFeeType, float $lateFeeAmount, int $graceDays, string $name = 'Standard Fee'): FeePlan
    {
        $tuition = FeeHead::firstOrCreate(
            ['campus_id' => $this->campus->id, 'code' => 'TUI'],
            [
                'institution_id' => $this->institution->id,
                'name' => 'Tuition Fee',
                'income_account_id' => $this->accounts->get('4010')->id,
            ]
        );

        $response = $this->as($this->admin)->postJson('/api/v1/fee-plans', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'name' => $name,
            'late_fee_type' => $lateFeeType,
            'late_fee_amount' => $lateFeeAmount,
            'late_fee_grace_days' => $graceDays,
            'items' => [
                ['fee_head_id' => $tuition->id, 'amount' => 30000],
            ],
            'installments' => [
                ['label' => 'First', 'due_date' => '2026-07-10', 'percentage' => 40],
                ['label' => 'Second', 'due_date' => '2026-10-10', 'percentage' => 30],
                ['label' => 'Third', 'due_date' => '2027-01-10', 'percentage' => 30],
            ],
        ])->assertStatus(201);

        return FeePlan::query()->findOrFail($response->json('data.id'));
    }

    private function voucher(FeePlan $plan): FeeVoucher
    {
        $this->as($this->admin)->postJson('/api/v1/fee-vouchers/generate', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'fee_plan_id' => $plan->id,
        ])->assertStatus(201);

        return FeeVoucher::query()
            ->where('student_id', $this->ali->id)
            ->where('sequence', 1)
            ->firstOrFail();
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

    private function student(string $admissionNo, string $first, string $last): Student
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

    private function enroll(Student $student): void
    {
        StudentEnrollment::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $student->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'section_id' => $this->section->id,
            'status' => 'active',
        ]);
    }
}
