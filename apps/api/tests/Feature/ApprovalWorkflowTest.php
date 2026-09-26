<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\Campus;
use App\Models\ChartOfAccount;
use App\Models\ExpenseCategory;
use App\Models\FiscalYear;
use App\Models\Institution;
use App\Models\User;
use App\Models\Vendor;
use App\Services\Accounting\DefaultChartOfAccounts;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Tests\TestCase;

class ApprovalWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private User $financeHead;

    /** @var Collection<string, ChartOfAccount> */
    private Collection $accounts;

    private Vendor $vendor;

    private ExpenseCategory $category;

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
        $this->financeHead = $this->actor(RoleName::FinanceHead);

        FiscalYear::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'FY 2026-2027', 'code' => 'FY27',
            'starts_on' => '2026-07-01', 'ends_on' => '2027-06-30',
            'status' => 'open', 'is_current' => true,
        ]);

        $this->accounts = app(DefaultChartOfAccounts::class)->seed($this->campus);

        $this->vendor = Vendor::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'code' => 'VND-1', 'name' => 'Stationery Mart',
            'payable_account_id' => $this->accounts->get('2010')->id,
        ]);

        $this->category = ExpenseCategory::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'code' => 'SUP', 'name' => 'Teaching Supplies',
            'expense_account_id' => $this->accounts->get('5030')->id,
        ]);
    }

    public function test_expense_above_threshold_is_blocked_until_the_workflow_approves(): void
    {
        $this->workflow(minAmount: 1000);
        $expenseId = $this->expense(5000);

        $this->as($this->admin)->postJson("/api/v1/expenses/{$expenseId}/approve")
            ->assertStatus(422)
            ->assertJsonValidationErrors('approval');

        $requestId = $this->as($this->admin)->postJson('/api/v1/approvals', [
            'entity_type' => 'expense',
            'entity_id' => $expenseId,
        ])->assertStatus(201)
            ->assertJsonPath('data.status', 'pending')
            ->json('data.id');

        $this->as($this->financeHead)->postJson("/api/v1/approvals/{$requestId}/approve", [
            'comment' => 'Budget allows.',
        ])->assertOk()->assertJsonPath('data.status', 'approved');

        $this->as($this->admin)->postJson("/api/v1/expenses/{$expenseId}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');
    }

    public function test_expense_below_threshold_skips_the_workflow(): void
    {
        $this->workflow(minAmount: 10000);
        $expenseId = $this->expense(5000);

        $this->as($this->admin)->postJson("/api/v1/expenses/{$expenseId}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');
    }

    public function test_only_the_required_role_can_approve_a_step(): void
    {
        $this->workflow(minAmount: 0);
        $expenseId = $this->expense(2000);

        $requestId = $this->as($this->admin)->postJson('/api/v1/approvals', [
            'entity_type' => 'expense',
            'entity_id' => $expenseId,
        ])->assertStatus(201)->json('data.id');

        $this->as($this->admin)->postJson("/api/v1/approvals/{$requestId}/approve")
            ->assertStatus(403);

        $this->as($this->financeHead)->postJson("/api/v1/approvals/{$requestId}/approve")
            ->assertOk()->assertJsonPath('data.status', 'approved');
    }

    public function test_a_rejection_leaves_the_expense_gated(): void
    {
        $this->workflow(minAmount: 0);
        $expenseId = $this->expense(3000);

        $requestId = $this->as($this->admin)->postJson('/api/v1/approvals', [
            'entity_type' => 'expense',
            'entity_id' => $expenseId,
        ])->assertStatus(201)->json('data.id');

        $this->as($this->financeHead)->postJson("/api/v1/approvals/{$requestId}/reject", [
            'comment' => 'Not justified.',
        ])->assertOk()->assertJsonPath('data.status', 'rejected');

        $this->as($this->admin)->postJson("/api/v1/expenses/{$expenseId}/approve")
            ->assertStatus(422)
            ->assertJsonValidationErrors('approval');
    }

    private function workflow(float $minAmount): int
    {
        return $this->as($this->admin)->postJson('/api/v1/approval-workflows', [
            'name' => 'Expense control',
            'code' => 'EXP-'.(int) $minAmount,
            'entity_type' => 'expense',
            'min_amount' => $minAmount,
            'steps' => [
                ['sequence' => 1, 'label' => 'Finance sign-off', 'required_role' => RoleName::FinanceHead->value],
            ],
        ])->assertStatus(201)->json('data.id');
    }

    private function expense(float $amount): int
    {
        return $this->as($this->admin)->postJson('/api/v1/expenses', [
            'vendor_id' => $this->vendor->id,
            'expense_date' => '2026-08-05',
            'lines' => [
                ['expense_category_id' => $this->category->id, 'amount' => $amount, 'description' => 'Supplies'],
            ],
        ])->assertStatus(201)->json('data.id');
    }

    private function as(User $user): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('t')->plainTextToken);
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
}
