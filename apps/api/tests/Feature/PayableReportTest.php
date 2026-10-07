<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\Campus;
use App\Models\Institution;
use App\Models\PaymentVoucher;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PayableReportTest extends TestCase
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

        $this->institution = Institution::create(['name' => 'Test Trust', 'code' => 'TT']);
        $this->campus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus A', 'code' => 'A', 'type' => CampusType::School->value,
        ]);

        $this->admin = $this->actor(RoleName::CampusAdmin);
        $this->teacher = $this->actor(RoleName::Teacher);
    }

    public function test_summary_requires_finance_permission(): void
    {
        $this->as($this->teacher)->getJson('/api/v1/payable-reports/summary')
            ->assertStatus(403);
    }

    public function test_summary_totals_counts_and_monthly_breakdown(): void
    {
        $today = Carbon::today();
        $lastMonth = $today->copy()->subMonth();

        $this->createVoucher([
            'category' => 'legacy', 'voucher_no' => 'EXP-000001',
            'payment_date' => $today->toDateString(), 'status' => 'paid',
            'total_amount' => 45000, 'paid_amount' => 45000,
        ]);

        $this->createVoucher([
            'category' => 'purchase', 'voucher_no' => 'PUR-000001',
            'payment_date' => $lastMonth->toDateString(), 'status' => 'approved',
            'total_amount' => 30000, 'paid_amount' => 0,
            'due_date' => $today->copy()->subDays(5)->toDateString(),
        ]);

        $this->createVoucher([
            'category' => 'utility', 'voucher_no' => 'UTL-000001',
            'payment_date' => $today->toDateString(), 'status' => 'partial',
            'total_amount' => 20000, 'paid_amount' => 5000,
        ]);

        $this->createVoucher([
            'category' => 'other', 'voucher_no' => 'OTH-000001',
            'payment_date' => $today->toDateString(), 'status' => 'draft',
            'total_amount' => 12000, 'paid_amount' => 0,
        ]);

        $this->createVoucher([
            'category' => 'other', 'voucher_no' => 'OTH-000002',
            'payment_date' => $today->toDateString(), 'status' => 'cancelled',
            'total_amount' => 10000, 'paid_amount' => 0,
        ]);

        $this->as($this->admin)->getJson('/api/v1/payable-reports/summary')
            ->assertOk()
            ->assertJsonPath('totals.payable', '107000.00')
            ->assertJsonPath('totals.paid', '50000.00')
            ->assertJsonPath('totals.outstanding', '57000.00')
            ->assertJsonPath('totals.overdue', '30000.00')
            ->assertJsonPath('counts.overdue', 1)
            ->assertJsonPath('counts.pending_approval', 0)
            ->assertJsonPath('counts.draft', 1)
            ->assertJsonPath('vouchers_by_status.paid', 1)
            ->assertJsonPath('vouchers_by_status.approved', 1)
            ->assertJsonPath('vouchers_by_status.partial', 1)
            ->assertJsonPath('vouchers_by_status.draft', 1);

        $summary = $this->as($this->admin)
            ->getJson('/api/v1/payable-reports/summary')
            ->assertOk()
            ->json();

        $this->assertCount(6, $summary['by_month']);

        $current = end($summary['by_month']);
        $this->assertSame($today->format('Y-m'), $current['month']);
        $this->assertSame('77000.00', $current['payable']);
        $this->assertSame('50000.00', $current['paid']);

        $previous = $summary['by_month'][4];
        $this->assertSame($lastMonth->format('Y-m'), $previous['month']);
        $this->assertSame('30000.00', $previous['payable']);
        $this->assertSame('0.00', $previous['paid']);

        $categories = collect($summary['by_category'])->pluck('payable', 'category')->all();
        $this->assertSame(['legacy' => '45000.00', 'other' => '12000.00', 'purchase' => '30000.00', 'utility' => '20000.00'], $categories);
    }

    private function createVoucher(array $attributes): PaymentVoucher
    {
        return PaymentVoucher::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            ...$attributes,
        ]);
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
}
