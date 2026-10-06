<?php

namespace Tests\Feature;

use App\Enums\RoleName;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsFeeTenant;
use Tests\TestCase;

class FeeArAccessTest extends TestCase
{
    use BuildsFeeTenant;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->setUpFeeTenant();
    }

    public function test_teacher_with_only_academic_view_is_denied(): void
    {
        $teacher = $this->actor(RoleName::Teacher);
        $this->assertTrue($teacher->hasPermissionTo('academic.view'));

        $this->as($teacher)->getJson('/api/v1/fee-reports/ar')->assertStatus(403);
        $this->as($teacher)->getJson('/api/v1/fee-counter/students')->assertStatus(403);
        $this->as($teacher)->getJson('/api/v1/fee-receipts')->assertStatus(403);

        $this->as($teacher)->postJson('/api/v1/fee-counter/generate', [
            'student_id' => $this->ali->id,
            'academic_year_id' => $this->year->id,
            'items' => [[
                'billing_kind' => 'monthly',
                'amount' => 1000,
            ]],
        ])->assertStatus(403);

        $this->as($teacher)->postJson('/api/v1/fee-receipts', [
            'student_id' => $this->ali->id,
            'payment_date' => '2026-07-15',
            'amount' => 1000,
            'method' => 'cash',
        ])->assertStatus(403);
    }

    public function test_academic_create_grants_voucher_generation_and_collection(): void
    {
        $user = $this->userWithPermissions(['academic.create']);

        $this->as($user)->getJson('/api/v1/fee-reports/ar')->assertOk();
        $this->as($user)->getJson('/api/v1/fee-counter/students')->assertOk();

        $chargeId = $this->as($user)
            ->postJson('/api/v1/fee-counter/generate', [
                'student_id' => $this->ali->id,
                'academic_year_id' => $this->year->id,
                'items' => [[
                    'billing_kind' => 'monthly',
                    'period_year' => 2026,
                    'period_month' => 7,
                    'title' => 'Tuition Fee',
                    'amount' => 12000,
                    'due_date' => '2026-07-10',
                ]],
            ])
            ->assertStatus(201)
            ->json('charges.0.id');

        $this->as($user)
            ->postJson('/api/v1/fee-receipts', [
                'student_id' => $this->ali->id,
                'fee_charge_id' => $chargeId,
                'academic_year_id' => $this->year->id,
                'payment_date' => '2026-07-15',
                'amount' => 4000,
                'method' => 'cash',
            ])
            ->assertStatus(201);
    }

    public function test_finance_view_grants_voucher_generation_and_collection(): void
    {
        $user = $this->userWithPermissions(['finance.view']);

        $this->as($user)->getJson('/api/v1/fee-reports/ar')->assertOk();

        $chargeId = $this->as($user)
            ->postJson('/api/v1/fee-counter/generate', [
                'student_id' => $this->ali->id,
                'academic_year_id' => $this->year->id,
                'items' => [[
                    'billing_kind' => 'monthly',
                    'period_year' => 2026,
                    'period_month' => 7,
                    'title' => 'Tuition Fee',
                    'amount' => 12000,
                    'due_date' => '2026-07-10',
                ]],
            ])
            ->assertStatus(201)
            ->json('charges.0.id');

        $this->as($user)
            ->postJson('/api/v1/fee-receipts', [
                'student_id' => $this->ali->id,
                'fee_charge_id' => $chargeId,
                'payment_date' => '2026-07-15',
                'amount' => 4000,
                'method' => 'cash',
            ])
            ->assertStatus(201);
    }

    public function test_principal_role_has_accounts_receivable_access(): void
    {
        $principal = $this->actor(RoleName::Principal);

        $this->assertTrue($principal->hasPermissionTo('fee.view'));

        $this->as($principal)->getJson('/api/v1/fee-reports/ar')->assertOk();
        $this->as($principal)->getJson('/api/v1/fee-counter/students')->assertOk();

        $this->as($principal)
            ->postJson('/api/v1/fee-counter/generate', [
                'student_id' => $this->ali->id,
                'academic_year_id' => $this->year->id,
                'items' => [[
                    'billing_kind' => 'monthly',
                    'period_year' => 2026,
                    'period_month' => 8,
                    'title' => 'Tuition Fee',
                    'amount' => 12000,
                    'due_date' => '2026-08-10',
                ]],
            ])
            ->assertStatus(201);
    }

    public function test_academic_coordinator_role_reaches_accounts_receivable(): void
    {
        $coordinator = $this->actor(RoleName::AcademicCoordinator);

        $this->as($coordinator)->getJson('/api/v1/fee-reports/ar')->assertOk();
        $this->as($coordinator)->getJson('/api/v1/fee-counter/students')->assertOk();
        $this->as($coordinator)->getJson('/api/v1/fee-receipts')->assertOk();
    }

    public function test_accountant_role_reaches_accounts_receivable(): void
    {
        $accountant = $this->actor(RoleName::Accountant);

        $this->as($accountant)->getJson('/api/v1/fee-reports/ar')->assertOk();
        $this->as($accountant)->getJson('/api/v1/fee-counter/students')->assertOk();
        $this->as($accountant)->getJson('/api/v1/fee-receipts')->assertOk();
    }

    public function test_unrelated_permission_is_denied(): void
    {
        $user = $this->userWithPermissions(['student.view']);

        $this->as($user)->getJson('/api/v1/fee-reports/ar')->assertStatus(403);
        $this->as($user)->getJson('/api/v1/fee-counter/students')->assertStatus(403);
    }

    public function test_teacher_cannot_manage_fee_configuration(): void
    {
        $teacher = $this->actor(RoleName::Teacher);

        $this->as($teacher)->getJson('/api/v1/fee-heads')->assertStatus(403);
        $this->as($teacher)->getJson('/api/v1/fee-plans')->assertStatus(403);
    }
}
