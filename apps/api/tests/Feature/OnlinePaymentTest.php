<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\PaymentIntentStatus;
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
use App\Models\PaymentIntent;
use App\Models\Section;
use App\Models\Stage;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\User;
use App\Services\Accounting\DefaultChartOfAccounts;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class OnlinePaymentTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private AcademicYear $year;

    private ClassRoom $class;

    private Section $section;

    /** @var Collection<string, ChartOfAccount> */
    private Collection $accounts;

    private Student $student;

    private FeeVoucher $voucher;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('payments.webhook_secret', 'test-secret');
        config()->set('payments.currency', 'PKR');

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
            'section_id' => $this->section->id,
            'status' => 'active',
        ]);

        $this->voucher = $this->issuedVoucher();
    }

    public function test_checkout_can_be_initiated_for_a_voucher(): void
    {
        $response = $this->as($this->admin)->postJson('/api/v1/online-payments', [
            'student_id' => $this->student->id,
            'fee_voucher_id' => $this->voucher->id,
            'amount' => 12000,
        ])->assertStatus(201)
            ->assertJsonPath('data.status', PaymentIntentStatus::Pending->value)
            ->assertJsonPath('data.reference', 'PAY-000001');

        $this->assertStringContainsString('reference=PAY-000001', $response->json('data.checkout_url'));

        $this->assertDatabaseHas('payment_intents', [
            'student_id' => $this->student->id,
            'fee_voucher_id' => $this->voucher->id,
            'status' => 'pending',
        ]);
    }

    public function test_initiate_rejects_amount_over_the_voucher_balance(): void
    {
        $this->as($this->admin)->postJson('/api/v1/online-payments', [
            'student_id' => $this->student->id,
            'fee_voucher_id' => $this->voucher->id,
            'amount' => 50000,
        ])->assertStatus(422)->assertJsonValidationErrors('amount');
    }

    public function test_initiate_rejects_an_unknown_gateway(): void
    {
        $this->as($this->admin)->postJson('/api/v1/online-payments', [
            'student_id' => $this->student->id,
            'fee_voucher_id' => $this->voucher->id,
            'amount' => 100,
            'gateway' => 'stripe',
        ])->assertStatus(422)->assertJsonValidationErrors('gateway');
    }

    public function test_webhook_posts_the_payment_and_settles_the_voucher(): void
    {
        $reference = $this->initiate();

        $this->postWebhook('manual', [
            'reference' => $reference,
            'status' => 'paid',
            'amount' => 30000,
            'provider_txn' => 'TXN-42',
        ])->assertOk()
            ->assertJsonPath('data.status', PaymentIntentStatus::Paid->value);

        $this->assertSame(1, FeePayment::query()->count());

        $voucher = $this->voucher->refresh();
        $this->assertSame(VoucherStatus::Paid, $voucher->status);
        $this->assertSame('30000.00', (string) $voucher->paid_amount);

        $intent = PaymentIntent::query()->where('reference', $reference)->firstOrFail();
        $this->assertSame(PaymentIntentStatus::Paid, $intent->status);
        $this->assertNotNull($intent->fee_payment_id);
        $this->assertNotNull($intent->paid_at);
    }

    public function test_webhook_is_idempotent(): void
    {
        $reference = $this->initiate();

        $payload = ['reference' => $reference, 'status' => 'paid', 'amount' => 30000];

        $this->postWebhook('manual', $payload)->assertOk();
        $this->postWebhook('manual', $payload)->assertOk();

        $this->assertSame(1, FeePayment::query()->count());
    }

    public function test_webhook_rejects_an_invalid_signature(): void
    {
        $reference = $this->initiate();

        $body = json_encode(['reference' => $reference, 'status' => 'paid', 'amount' => 12000]);

        $this->call('POST', '/api/v1/webhooks/payments/manual', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_PAYMENT_SIGNATURE' => 'not-a-valid-signature',
        ], $body)->assertStatus(401);

        $this->assertSame(0, FeePayment::query()->count());
    }

    public function test_teacher_cannot_initiate_online_payments(): void
    {
        $teacher = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $teacher->syncRoles([RoleName::Teacher->value]);

        $this->as($teacher)->postJson('/api/v1/online-payments', [
            'student_id' => $this->student->id,
            'fee_voucher_id' => $this->voucher->id,
            'amount' => 100,
        ])->assertStatus(403);
    }

    private function initiate(): string
    {
        return $this->as($this->admin)->postJson('/api/v1/online-payments', [
            'student_id' => $this->student->id,
            'fee_voucher_id' => $this->voucher->id,
            'amount' => 30000,
        ])->assertStatus(201)->json('data.reference');
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function postWebhook(string $gateway, array $payload): TestResponse
    {
        $body = json_encode($payload);
        $signature = hash_hmac('sha256', $body, 'test-secret');

        return $this->call('POST', "/api/v1/webhooks/payments/{$gateway}", [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_ACCEPT' => 'application/json',
            'HTTP_X_PAYMENT_SIGNATURE' => $signature,
        ], $body);
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
