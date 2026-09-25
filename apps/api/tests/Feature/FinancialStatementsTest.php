<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\Campus;
use App\Models\ChartOfAccount;
use App\Models\FiscalYear;
use App\Models\Institution;
use App\Models\User;
use App\Services\Accounting\DefaultChartOfAccounts;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Tests\TestCase;

class FinancialStatementsTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

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

        $this->admin = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $this->admin->syncRoles([RoleName::CampusAdmin->value]);

        $this->fiscalYear = FiscalYear::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'FY 2026-2027', 'code' => 'FY27',
            'starts_on' => '2026-07-01', 'ends_on' => '2027-06-30',
            'status' => 'open', 'is_current' => true,
        ]);

        $this->accounts = app(DefaultChartOfAccounts::class)->seed($this->campus);
    }

    public function test_surplus_statement_reports_net_surplus(): void
    {
        $this->postEntry([
            [$this->accounts->get('1010'), 100000, 0],
            [$this->accounts->get('4010'), 0, 100000],
        ], '2026-07-05');

        $this->postEntry([
            [$this->accounts->get('5010'), 40000, 0],
            [$this->accounts->get('1020'), 0, 40000],
        ], '2026-07-20');

        $this->as($this->admin)
            ->getJson("/api/v1/finance/reports/surplus-deficit?fiscal_year_id={$this->fiscalYear->id}")
            ->assertOk()
            ->assertJsonPath('totals.income', '100000.00')
            ->assertJsonPath('totals.expense', '40000.00')
            ->assertJsonPath('totals.net', '60000.00')
            ->assertJsonPath('totals.result', 'surplus')
            ->assertJsonCount(1, 'income')
            ->assertJsonCount(1, 'expense');
    }

    public function test_surplus_statement_reports_deficit(): void
    {
        $this->postEntry([
            [$this->accounts->get('1010'), 30000, 0],
            [$this->accounts->get('4010'), 0, 30000],
        ], '2026-07-05');

        $this->postEntry([
            [$this->accounts->get('5010'), 50000, 0],
            [$this->accounts->get('1020'), 0, 50000],
        ], '2026-07-20');

        $this->as($this->admin)
            ->getJson("/api/v1/finance/reports/surplus-deficit?fiscal_year_id={$this->fiscalYear->id}")
            ->assertOk()
            ->assertJsonPath('totals.net', '-20000.00')
            ->assertJsonPath('totals.result', 'deficit');
    }

    public function test_consolidated_statement_balances_assets_to_funding(): void
    {
        $this->postEntry([
            [$this->accounts->get('1010'), 100000, 0],
            [$this->accounts->get('4010'), 0, 100000],
        ], '2026-07-05');

        $this->postEntry([
            [$this->accounts->get('5010'), 40000, 0],
            [$this->accounts->get('1010'), 0, 40000],
        ], '2026-07-20');

        $this->as($this->admin)
            ->getJson("/api/v1/finance/reports/consolidated?fiscal_year_id={$this->fiscalYear->id}")
            ->assertOk()
            ->assertJsonPath('income_statement.totals.net', '60000.00')
            ->assertJsonPath('balance_sheet.totals.assets', '60000.00')
            ->assertJsonPath('balance_sheet.totals.liabilities_and_equity', '60000.00')
            ->assertJsonPath('balance_sheet.totals.balanced', true)
            ->assertJsonCount(1, 'balance_sheet.assets');
    }

    /**
     * @param  array<int, array{0: ChartOfAccount, 1: float|int, 2: float|int}>  $lines
     */
    private function postEntry(array $lines, string $date): void
    {
        $entryId = $this->as($this->admin)->postJson('/api/v1/journal-entries', [
            'fiscal_year_id' => $this->fiscalYear->id,
            'entry_date' => $date,
            'memo' => 'Statement test',
            'lines' => array_map(fn (array $line) => [
                'chart_of_account_id' => $line[0]->id,
                'debit' => $line[1],
                'credit' => $line[2],
            ], $lines),
        ])->assertStatus(201)->json('data.id');

        $this->as($this->admin)->postJson("/api/v1/journal-entries/{$entryId}/post")
            ->assertOk();
    }

    private function as(User $user): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('t')->plainTextToken);
    }
}
