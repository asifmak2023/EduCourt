<?php

namespace Tests\Feature;

use App\Enums\BudgetPeriodType;
use App\Enums\BudgetStatus;
use App\Enums\CampusType;
use App\Enums\JournalStatus;
use App\Enums\RoleName;
use App\Models\Campus;
use App\Models\ChartOfAccount;
use App\Models\FiscalYear;
use App\Models\Institution;
use App\Models\JournalEntry;
use App\Models\User;
use App\Services\Accounting\DefaultChartOfAccounts;
use App\Services\Accounting\JournalService;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Tests\TestCase;

class BudgetTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private User $teacher;

    private FiscalYear $fiscalYear;

    /** @var Collection<string, ChartOfAccount> */
    private Collection $accounts;

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

        $this->fiscalYear = FiscalYear::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'FY 2026-2027', 'code' => 'FY27',
            'starts_on' => '2026-07-01', 'ends_on' => '2027-06-30',
            'status' => 'open', 'is_current' => true,
        ]);

        $this->accounts = app(DefaultChartOfAccounts::class)->seed($this->campus);
    }

    public function test_budget_can_be_created_with_lines(): void
    {
        $response = $this->as($this->admin)->postJson('/api/v1/budgets', $this->payload())
            ->assertStatus(201)
            ->assertJsonPath('data.name', 'Operating Budget')
            ->assertJsonPath('data.period_type', 'annual')
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.total_budget', '2760000.00')
            ->assertJsonCount(2, 'data.lines');

        $this->assertDatabaseHas('budget_lines', [
            'budget_id' => $response->json('data.id'),
            'chart_of_account_id' => $this->accounts->get('5010')->id,
        ]);
    }

    public function test_budget_rejects_group_account(): void
    {
        $payload = $this->payload();
        $payload['lines'][0]['chart_of_account_id'] = $this->accounts->get('5000')->id;

        $this->as($this->admin)->postJson('/api/v1/budgets', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('lines.0.chart_of_account_id');
    }

    public function test_budget_name_is_unique_per_fiscal_year(): void
    {
        $this->as($this->admin)->postJson('/api/v1/budgets', $this->payload())->assertStatus(201);

        $this->as($this->admin)->postJson('/api/v1/budgets', $this->payload())
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');
    }

    public function test_budget_requires_valid_period(): void
    {
        $payload = $this->payload();
        $payload['ends_on'] = '2026-06-01';

        $this->as($this->admin)->postJson('/api/v1/budgets', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('ends_on');
    }

    public function test_draft_budget_can_be_updated(): void
    {
        $id = $this->as($this->admin)->postJson('/api/v1/budgets', $this->payload())
            ->assertStatus(201)
            ->json('data.id');

        $this->as($this->admin)->putJson("/api/v1/budgets/{$id}", [
            'name' => 'Revised Operating Budget',
            'lines' => [
                ['chart_of_account_id' => $this->accounts->get('5010')->id, 'amount' => 3000000],
            ],
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Revised Operating Budget')
            ->assertJsonPath('data.total_budget', '3000000.00')
            ->assertJsonCount(1, 'data.lines');
    }

    public function test_budget_can_be_approved_then_locked(): void
    {
        $id = $this->as($this->admin)->postJson('/api/v1/budgets', $this->payload())
            ->assertStatus(201)
            ->json('data.id');

        $this->as($this->admin)->postJson("/api/v1/budgets/{$id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->assertDatabaseHas('budgets', [
            'id' => $id,
            'status' => BudgetStatus::Approved->value,
        ]);

        $this->as($this->admin)->putJson("/api/v1/budgets/{$id}", ['name' => 'Nope'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');

        $this->as($this->admin)->postJson("/api/v1/budgets/{$id}/approve")
            ->assertStatus(422);
    }

    public function test_index_filters_by_fiscal_year_and_status(): void
    {
        $this->as($this->admin)->postJson('/api/v1/budgets', $this->payload())->assertStatus(201);

        $this->as($this->admin)
            ->getJson('/api/v1/budgets?fiscal_year_id='.$this->fiscalYear->id.'&status=draft')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->as($this->admin)
            ->getJson('/api/v1/budgets?status=approved')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_budget_vs_actual_reports_spend_against_budget(): void
    {
        $id = $this->as($this->admin)->postJson('/api/v1/budgets', $this->payload())
            ->assertStatus(201)
            ->json('data.id');

        $this->postExpense(120000);

        $response = $this->as($this->admin)
            ->getJson("/api/v1/finance/reports/budget-vs-actual?budget_id={$id}")
            ->assertOk()
            ->assertJsonPath('budget.id', $id)
            ->assertJsonPath('totals.budget', '2760000.00')
            ->assertJsonPath('totals.actual', '120000.00');

        $salary = collect($response->json('data'))->firstWhere('code', '5010');

        $this->assertSame('2400000.00', $salary['budget']);
        $this->assertSame('120000.00', $salary['actual']);
        $this->assertSame('-2280000.00', $salary['variance']);
        $this->assertEquals(5.0, $salary['utilization']);
        $this->assertTrue($salary['favorable']);
    }

    public function test_teacher_cannot_manage_or_view_budgets(): void
    {
        $this->as($this->teacher)->getJson('/api/v1/budgets')->assertStatus(403);
        $this->as($this->teacher)->postJson('/api/v1/budgets', $this->payload())->assertStatus(403);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(): array
    {
        return [
            'fiscal_year_id' => $this->fiscalYear->id,
            'name' => 'Operating Budget',
            'period_type' => BudgetPeriodType::Annual->value,
            'starts_on' => '2026-07-01',
            'ends_on' => '2027-06-30',
            'notes' => 'Board draft.',
            'lines' => [
                ['chart_of_account_id' => $this->accounts->get('5010')->id, 'amount' => 2400000],
                ['chart_of_account_id' => $this->accounts->get('5020')->id, 'amount' => 360000],
            ],
        ];
    }

    private function postExpense(float $amount): void
    {
        $entry = JournalEntry::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'fiscal_year_id' => $this->fiscalYear->id,
            'reference' => 'JV/TEST/0001',
            'entry_date' => '2026-08-01',
            'status' => JournalStatus::Draft,
            'memo' => 'Test salary expense',
        ]);

        $entry->lines()->createMany([
            [
                'chart_of_account_id' => $this->accounts->get('5010')->id,
                'line_no' => 1,
                'debit' => $amount,
                'credit' => 0,
            ],
            [
                'chart_of_account_id' => $this->accounts->get('1020')->id,
                'line_no' => 2,
                'debit' => 0,
                'credit' => $amount,
            ],
        ]);

        app(JournalService::class)->post($entry, $this->admin->id);
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
