<?php

namespace Tests\Feature;

use App\Enums\RoleName;
use App\Enums\VoucherStatus;
use App\Models\FeeCharge;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsFeeTenant;
use Tests\TestCase;

class FeeReceiptPaymentTest extends TestCase
{
    use BuildsFeeTenant;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->setUpFeeTenant();
    }

    public function test_partial_payment_creates_receipt_and_reduces_outstanding(): void
    {
        $admin = $this->actor(RoleName::CampusAdmin);
        $chargeId = $this->generateCharge($this->ali)['charges'][0]['id'];

        $response = $this->as($admin)
            ->postJson('/api/v1/fee-receipts', [
                'student_id' => $this->ali->id,
                'fee_charge_id' => $chargeId,
                'academic_year_id' => $this->year->id,
                'payment_date' => '2026-07-15',
                'amount' => 5000,
                'method' => 'cash',
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.amount', '5000.00')
            ->assertJsonPath('data.student_id', $this->ali->id)
            ->assertJsonCount(1, 'data.allocations');

        $this->assertStringStartsWith('RV-', $response->json('data.receipt_no'));

        $charge = FeeCharge::query()->findOrFail($chargeId);
        $this->assertSame(7000.0, $charge->balance());
        $this->assertSame(VoucherStatus::Partial, $charge->status);

        $this->as($admin)
            ->getJson("/api/v1/fee-receipts/{$response->json('data.id')}")
            ->assertOk()
            ->assertJsonPath('data.campus.name', 'Campus A')
            ->assertJsonPath('data.institution.name', 'Test Trust');
    }

    public function test_full_payment_marks_charge_paid(): void
    {
        $admin = $this->actor(RoleName::CampusAdmin);
        $chargeId = $this->generateCharge($this->ali, 12000)['charges'][0]['id'];

        $this->as($admin)
            ->postJson('/api/v1/fee-receipts', [
                'student_id' => $this->ali->id,
                'fee_charge_id' => $chargeId,
                'academic_year_id' => $this->year->id,
                'payment_date' => '2026-07-15',
                'amount' => 12000,
                'method' => 'online',
            ])
            ->assertStatus(201);

        $this->assertSame(
            VoucherStatus::Paid,
            FeeCharge::query()->findOrFail($chargeId)->status
        );
    }

    public function test_overpayment_is_rejected(): void
    {
        $admin = $this->actor(RoleName::CampusAdmin);
        $chargeId = $this->generateCharge($this->ali, 12000)['charges'][0]['id'];

        $this->as($admin)
            ->postJson('/api/v1/fee-receipts', [
                'student_id' => $this->ali->id,
                'fee_charge_id' => $chargeId,
                'academic_year_id' => $this->year->id,
                'payment_date' => '2026-07-15',
                'amount' => 20000,
                'method' => 'cash',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('amount');
    }

    public function test_payment_pins_to_a_specific_charge(): void
    {
        $admin = $this->actor(RoleName::CampusAdmin);
        $oldest = $this->generateCharge($this->ali, 12000, 'Tuition Fee', '2026-07-10')['charges'][0]['id'];
        $newest = $this->generateCharge($this->ali, 8000, 'Transport Fee', '2026-08-10')['charges'][0]['id'];

        $this->as($admin)
            ->postJson('/api/v1/fee-receipts', [
                'student_id' => $this->ali->id,
                'fee_charge_id' => $newest,
                'academic_year_id' => $this->year->id,
                'payment_date' => '2026-08-15',
                'amount' => 8000,
                'method' => 'cash',
            ])
            ->assertStatus(201);

        $this->assertSame(VoucherStatus::Paid, FeeCharge::query()->findOrFail($newest)->status);
        $this->assertSame(VoucherStatus::Unpaid, FeeCharge::query()->findOrFail($oldest)->status);
    }

    public function test_payment_allocates_the_oldest_charge_first(): void
    {
        $admin = $this->actor(RoleName::CampusAdmin);
        $oldest = $this->generateCharge($this->ali, 12000, 'Tuition Fee', '2026-07-10')['charges'][0]['id'];
        $newest = $this->generateCharge($this->ali, 8000, 'Transport Fee', '2026-08-10')['charges'][0]['id'];

        $this->as($admin)
            ->postJson('/api/v1/fee-receipts', [
                'student_id' => $this->ali->id,
                'academic_year_id' => $this->year->id,
                'payment_date' => '2026-08-15',
                'amount' => 12000,
                'method' => 'cash',
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.allocations.0.fee_charge_id', $oldest);

        $this->assertSame(VoucherStatus::Paid, FeeCharge::query()->findOrFail($oldest)->status);
        $this->assertSame(VoucherStatus::Unpaid, FeeCharge::query()->findOrFail($newest)->status);
    }

    public function test_payment_rejects_a_charge_belonging_to_another_student(): void
    {
        $admin = $this->actor(RoleName::CampusAdmin);
        $saraCharge = $this->generateCharge($this->sara, 5000)['charges'][0]['id'];

        $this->as($admin)
            ->postJson('/api/v1/fee-receipts', [
                'student_id' => $this->ali->id,
                'fee_charge_id' => $saraCharge,
                'academic_year_id' => $this->year->id,
                'payment_date' => '2026-07-15',
                'amount' => 5000,
                'method' => 'cash',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('fee_charge_id');
    }

    public function test_void_charge_cannot_receive_a_payment(): void
    {
        $admin = $this->actor(RoleName::CampusAdmin);
        $chargeId = $this->generateCharge($this->ali, 12000)['charges'][0]['id'];

        $this->as($admin)
            ->postJson("/api/v1/fee-charges/{$chargeId}/void", ['memo' => 'Duplicate'])
            ->assertOk();

        $this->as($admin)
            ->postJson('/api/v1/fee-receipts', [
                'student_id' => $this->ali->id,
                'fee_charge_id' => $chargeId,
                'academic_year_id' => $this->year->id,
                'payment_date' => '2026-07-15',
                'amount' => 1000,
                'method' => 'cash',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('amount');
    }

    public function test_payment_method_must_be_valid(): void
    {
        $admin = $this->actor(RoleName::CampusAdmin);
        $chargeId = $this->generateCharge($this->ali, 12000)['charges'][0]['id'];

        $this->as($admin)
            ->postJson('/api/v1/fee-receipts', [
                'student_id' => $this->ali->id,
                'fee_charge_id' => $chargeId,
                'payment_date' => '2026-07-15',
                'amount' => 1000,
                'method' => 'barter',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('method');
    }
}
