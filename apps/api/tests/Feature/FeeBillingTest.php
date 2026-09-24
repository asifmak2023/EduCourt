<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\JournalStatus;
use App\Enums\PaymentStatus;
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
use App\Models\JournalEntry;
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

class FeeBillingTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private User $teacher;

    private AcademicYear $year;

    private ClassRoom $class;

    private Section $section;

    private FiscalYear $fiscalYear;

    /** @var Collection<string, ChartOfAccount> */
    private Collection $accounts;

    private Student $ali;

    private Student $sara;

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

        $this->fiscalYear = FiscalYear::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'FY 2026-2027', 'code' => 'FY27',
            'starts_on' => '2026-07-01', 'ends_on' => '2027-06-30',
            'status' => 'open', 'is_current' => true,
        ]);

        $this->accounts = app(DefaultChartOfAccounts::class)->seed($this->campus);

        $this->ali = $this->student('ADM-1', 'Ali', 'Raza');
        $this->sara = $this->student('ADM-2', 'Sara', 'Khan');

        $this->enroll($this->ali);
        $this->enroll($this->sara);
    }

    public function test_vouchers_are_generated_and_issued_for_a_class(): void
    {
        $plan = $this->plan();

        $response = $this->as($this->admin)->postJson('/api/v1/fee-vouchers/generate', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'fee_plan_id' => $plan->id,
        ])->assertStatus(201)
            ->assertJsonPath('created', 6)
            ->assertJsonPath('skipped', 0);

        $this->assertSame(6, FeeVoucher::query()->count());
        $this->assertSame(6, count($response->json('data')));

        $first = FeeVoucher::query()
            ->where('student_id', $this->ali->id)
            ->where('sequence', 1)
            ->firstOrFail();

        $this->assertSame('12000.00', (string) $first->gross_amount);
        $this->assertSame('12000.00', (string) $first->amount);
        $this->assertSame(VoucherStatus::Unpaid, $first->status);
        $this->assertNotNull($first->journal_entry_id);
        $this->assertNotNull($first->issued_at);

        $this->assertSame(1, $first->lines()->count());

        $this->assertSame(60000.0, (float) JournalLine::query()
            ->where('chart_of_account_id', $this->accounts->get('1110')->id)
            ->sum('debit'));
    }

    public function test_generation_skips_students_already_billed(): void
    {
        $plan = $this->plan();

        $payload = [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'fee_plan_id' => $plan->id,
        ];

        $this->as($this->admin)->postJson('/api/v1/fee-vouchers/generate', $payload)->assertStatus(201);
        $this->as($this->admin)->postJson('/api/v1/fee-vouchers/generate', $payload)
            ->assertStatus(201)
            ->assertJsonPath('created', 0)
            ->assertJsonPath('skipped', 6);

        $this->assertSame(6, FeeVoucher::query()->count());
    }

    public function test_discounts_are_applied_across_the_schedule(): void
    {
        $plan = $this->plan();

        $this->as($this->admin)->postJson('/api/v1/fee-vouchers/generate', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'fee_plan_id' => $plan->id,
            'discounts' => [$this->ali->id => 3000],
        ])->assertStatus(201);

        $aliTotal = (float) FeeVoucher::query()->where('student_id', $this->ali->id)->sum('amount');
        $saraTotal = (float) FeeVoucher::query()->where('student_id', $this->sara->id)->sum('amount');

        $this->assertSame(27000.0, $aliTotal);
        $this->assertSame(30000.0, $saraTotal);

        $first = FeeVoucher::query()
            ->where('student_id', $this->ali->id)
            ->where('sequence', 1)
            ->firstOrFail();

        $this->assertSame('1200.00', (string) $first->discount_amount);
        $this->assertSame('10800.00', (string) $first->amount);
    }

    public function test_payment_posts_to_the_ledger_and_updates_the_voucher(): void
    {
        $plan = $this->plan();
        $this->generate($plan);

        $voucher = FeeVoucher::query()
            ->where('student_id', $this->ali->id)
            ->where('sequence', 1)
            ->firstOrFail();

        $response = $this->as($this->admin)->postJson('/api/v1/fee-payments', [
            'student_id' => $this->ali->id,
            'fee_voucher_id' => $voucher->id,
            'payment_date' => '2026-07-15',
            'amount' => 5000,
            'method' => 'cash',
        ])->assertStatus(201);

        $this->assertStringStartsWith('RV-', $response->json('data.receipt_no'));

        $voucher->refresh();
        $this->assertSame('5000.00', (string) $voucher->paid_amount);
        $this->assertSame(VoucherStatus::Partial, $voucher->status);

        $this->assertSame(5000.0, (float) JournalLine::query()
            ->where('chart_of_account_id', $this->accounts->get('1010')->id)
            ->sum('debit'));

        $this->assertSame(5000.0, (float) JournalLine::query()
            ->where('chart_of_account_id', $this->accounts->get('1110')->id)
            ->sum('credit'));

        $this->assertSame(PaymentStatus::Posted, FeePayment::query()->firstOrFail()->status);
    }

    public function test_full_payment_marks_the_voucher_paid(): void
    {
        $plan = $this->plan();
        $this->generate($plan);

        $voucher = FeeVoucher::query()
            ->where('student_id', $this->sara->id)
            ->where('sequence', 2)
            ->firstOrFail();

        $this->as($this->admin)->postJson('/api/v1/fee-payments', [
            'student_id' => $this->sara->id,
            'fee_voucher_id' => $voucher->id,
            'payment_date' => '2026-10-15',
            'amount' => 9000,
            'method' => 'bank_transfer',
            'reference' => 'CHQ-1',
        ])->assertStatus(201);

        $this->assertSame(VoucherStatus::Paid, $voucher->refresh()->status);
    }

    public function test_payment_cannot_exceed_the_voucher_balance(): void
    {
        $plan = $this->plan();
        $this->generate($plan);

        $voucher = FeeVoucher::query()
            ->where('student_id', $this->ali->id)
            ->where('sequence', 1)
            ->firstOrFail();

        $this->as($this->admin)->postJson('/api/v1/fee-payments', [
            'student_id' => $this->ali->id,
            'fee_voucher_id' => $voucher->id,
            'payment_date' => '2026-07-15',
            'amount' => 50000,
            'method' => 'cash',
        ])->assertStatus(422)->assertJsonValidationErrors('amount');

        $this->assertSame(0, FeePayment::query()->count());
    }

    public function test_voiding_a_payment_reverses_the_ledger_and_reopens_the_voucher(): void
    {
        $plan = $this->plan();
        $this->generate($plan);

        $voucher = FeeVoucher::query()
            ->where('student_id', $this->ali->id)
            ->where('sequence', 1)
            ->firstOrFail();

        $paymentId = $this->as($this->admin)->postJson('/api/v1/fee-payments', [
            'student_id' => $this->ali->id,
            'fee_voucher_id' => $voucher->id,
            'payment_date' => '2026-07-15',
            'amount' => 12000,
            'method' => 'cash',
        ])->assertStatus(201)->json('data.id');

        $this->assertSame(VoucherStatus::Paid, $voucher->refresh()->status);

        $this->as($this->admin)
            ->postJson("/api/v1/fee-payments/{$paymentId}/void", ['memo' => 'Cheque bounced'])
            ->assertOk()
            ->assertJsonPath('data.status', 'void');

        $voucher->refresh();
        $this->assertSame('0.00', (string) $voucher->paid_amount);
        $this->assertSame(VoucherStatus::Unpaid, $voucher->status);

        $this->assertSame(12000.0, (float) JournalLine::query()
            ->where('chart_of_account_id', $this->accounts->get('1010')->id)
            ->sum('credit'));
    }

    public function test_voucher_with_a_posted_payment_cannot_be_voided(): void
    {
        $plan = $this->plan();
        $this->generate($plan);

        $voucher = FeeVoucher::query()
            ->where('student_id', $this->ali->id)
            ->where('sequence', 1)
            ->firstOrFail();

        $this->as($this->admin)->postJson('/api/v1/fee-payments', [
            'student_id' => $this->ali->id,
            'fee_voucher_id' => $voucher->id,
            'payment_date' => '2026-07-15',
            'amount' => 1000,
            'method' => 'cash',
        ])->assertStatus(201);

        $this->as($this->admin)
            ->postJson("/api/v1/fee-vouchers/{$voucher->id}/void")
            ->assertStatus(422);

        $this->assertNotSame(VoucherStatus::Void, $voucher->refresh()->status);
    }

    public function test_an_unpaid_voucher_can_be_voided_and_reversed(): void
    {
        $plan = $this->plan();
        $this->generate($plan);

        $voucher = FeeVoucher::query()
            ->where('student_id', $this->ali->id)
            ->where('sequence', 3)
            ->firstOrFail();

        $originalEntryId = $voucher->journal_entry_id;

        $this->as($this->admin)
            ->postJson("/api/v1/fee-vouchers/{$voucher->id}/void", ['memo' => 'Enrolment cancelled'])
            ->assertOk()
            ->assertJsonPath('data.status', 'void');

        $this->assertSame(VoucherStatus::Void, $voucher->refresh()->status);

        $this->assertSame(JournalStatus::Reversed, JournalEntry::query()->findOrFail($originalEntryId)->status);

        $reversal = JournalEntry::query()->where('reversal_of_id', $originalEntryId)->firstOrFail();
        $this->assertSame(JournalStatus::Posted, $reversal->status);
    }

    public function test_teacher_cannot_manage_fee_vouchers(): void
    {
        $plan = $this->plan();

        $this->as($this->teacher)->getJson('/api/v1/fee-vouchers')->assertStatus(403);

        $this->as($this->teacher)->postJson('/api/v1/fee-vouchers/generate', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'fee_plan_id' => $plan->id,
        ])->assertStatus(403);

        $this->as($this->teacher)->postJson('/api/v1/fee-payments', [
            'student_id' => $this->ali->id,
            'payment_date' => '2026-07-15',
            'amount' => 100,
            'method' => 'cash',
        ])->assertStatus(403);
    }

    private function plan(): FeePlan
    {
        $tuition = $this->feeHead('TUI', '4010');
        $transport = $this->feeHead('TRA', '4030');

        $response = $this->as($this->admin)->postJson('/api/v1/fee-plans', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'name' => 'Standard Fee',
            'items' => [
                ['fee_head_id' => $tuition->id, 'amount' => 30000],
                ['fee_head_id' => $transport->id, 'amount' => 4000, 'is_optional' => true],
            ],
            'installments' => [
                ['label' => 'First', 'due_date' => '2026-07-10', 'percentage' => 40],
                ['label' => 'Second', 'due_date' => '2026-10-10', 'percentage' => 30],
                ['label' => 'Third', 'due_date' => '2027-01-10', 'percentage' => 30],
            ],
        ])->assertStatus(201);

        return FeePlan::query()->findOrFail($response->json('data.id'));
    }

    private function generate(FeePlan $plan): void
    {
        $this->as($this->admin)->postJson('/api/v1/fee-vouchers/generate', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'fee_plan_id' => $plan->id,
        ])->assertStatus(201);
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

    private function feeHead(string $code, string $accountCode): FeeHead
    {
        return FeeHead::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'code' => $code,
            'name' => $code,
            'income_account_id' => $this->accounts->get($accountCode)->id,
        ]);
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
