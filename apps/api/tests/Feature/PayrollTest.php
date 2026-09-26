<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\PayrollRunStatus;
use App\Enums\RoleName;
use App\Models\Campus;
use App\Models\FiscalYear;
use App\Models\Institution;
use App\Models\JournalEntry;
use App\Models\PayrollAdjustment;
use App\Models\SalaryComponent;
use App\Models\StaffMember;
use App\Models\StaffSalary;
use App\Models\User;
use App\Services\Accounting\DefaultChartOfAccounts;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayrollTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private User $teacher;

    private User $finance;

    private StaffMember $staff;

    private SalaryComponent $allowance;

    private SalaryComponent $tax;

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
        $this->finance = $this->actor(RoleName::FinanceHead);

        FiscalYear::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'FY 2026-2027', 'code' => 'FY27',
            'starts_on' => '2026-07-01', 'ends_on' => '2027-06-30',
            'status' => 'open', 'is_current' => true,
        ]);

        app(DefaultChartOfAccounts::class)->seed($this->campus);

        $this->staff = StaffMember::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'employee_no' => 'EMP-0001',
            'first_name' => 'Ayesha', 'last_name' => 'Malik',
            'joining_date' => '2026-01-01', 'status' => 'active', 'employment_type' => 'permanent',
        ]);

        $this->allowance = SalaryComponent::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'House Allowance', 'code' => 'HRA', 'type' => 'earning',
            'calculation' => 'fixed', 'default_amount' => 5000,
        ]);

        $this->tax = SalaryComponent::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Income Tax', 'code' => 'TAX', 'type' => 'deduction',
            'calculation' => 'percentage_of_basic', 'default_percentage' => 10,
        ]);
    }

    public function test_payroll_run_generates_payslips_then_posts_and_pays(): void
    {
        $this->salaryStructure();

        $run = $this->as($this->finance)->postJson('/api/v1/payroll-runs', [
            'period' => '2026-09',
        ])->assertStatus(201)->json('data');

        $generated = $this->as($this->finance)
            ->postJson("/api/v1/payroll-runs/{$run['id']}/generate")
            ->assertOk()
            ->json('data');

        $this->assertSame('55000.00', $generated['total_gross']);
        $this->assertSame('5000.00', $generated['total_deductions']);
        $this->assertSame('50000.00', $generated['total_net']);
        $this->assertCount(1, $generated['payslips']);

        $approved = $this->as($this->finance)
            ->postJson("/api/v1/payroll-runs/{$run['id']}/approve")
            ->assertOk()
            ->json('data');

        $this->assertSame(PayrollRunStatus::Approved->value, $approved['status']);
        $this->assertNotNull($approved['journal_entry_id']);

        $entry = JournalEntry::query()->with('lines')->findOrFail($approved['journal_entry_id']);
        $this->assertSame(55000.0, (float) $entry->lines->sum('debit'));
        $this->assertSame(55000.0, (float) $entry->lines->sum('credit'));

        $paid = $this->as($this->finance)
            ->postJson("/api/v1/payroll-runs/{$run['id']}/pay", ['payment_method' => 'bank_transfer'])
            ->assertOk()
            ->json('data');

        $this->assertSame(PayrollRunStatus::Paid->value, $paid['status']);
        $this->assertNotNull($paid['paid_at']);

        $this->assertDatabaseCount('journal_entries', 2);
    }

    public function test_period_adjustments_are_applied_to_the_payslip(): void
    {
        $this->salaryStructure();

        PayrollAdjustment::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'staff_member_id' => $this->staff->id,
            'type' => 'bonus', 'amount' => 2000, 'period' => '2026-09',
            'reason' => 'Eid bonus',
        ]);

        $run = $this->as($this->finance)->postJson('/api/v1/payroll-runs', ['period' => '2026-09'])
            ->assertStatus(201)->json('data');

        $generated = $this->as($this->finance)
            ->postJson("/api/v1/payroll-runs/{$run['id']}/generate")
            ->assertOk()
            ->json('data');

        $this->assertSame('57000.00', $generated['total_gross']);
        $this->assertSame('52000.00', $generated['total_net']);
        $this->assertDatabaseHas('payroll_adjustments', ['id' => 1, 'is_applied' => true]);
    }

    public function test_teacher_cannot_access_payroll(): void
    {
        $this->as($this->teacher)->getJson('/api/v1/payroll-runs')->assertStatus(403);
        $this->as($this->teacher)->postJson('/api/v1/salary-components', [
            'name' => 'X', 'code' => 'X', 'type' => 'earning',
        ])->assertStatus(403);
    }

    private function salaryStructure(): void
    {
        StaffSalary::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'staff_member_id' => $this->staff->id,
            'basic_salary' => 50000,
            'effective_from' => '2026-01-01',
            'is_active' => true,
        ])->items()->createMany([
            ['salary_component_id' => $this->allowance->id, 'amount' => 5000],
            ['salary_component_id' => $this->tax->id, 'percentage' => 10],
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
