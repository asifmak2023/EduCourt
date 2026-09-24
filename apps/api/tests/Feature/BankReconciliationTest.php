<?php

namespace Tests\Feature;

use App\Enums\BankAccountType;
use App\Enums\CampusType;
use App\Enums\JournalStatus;
use App\Enums\RoleName;
use App\Models\BankAccount;
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

class BankReconciliationTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private User $teacher;

    private FiscalYear $fiscalYear;

    /** @var Collection<string, ChartOfAccount> */
    private Collection $accounts;

    private BankAccount $bank;

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

        $this->bank = BankAccount::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'chart_of_account_id' => $this->accounts->get('1020')->id,
            'code' => 'BA-1',
            'name' => 'Main Bank',
            'type' => BankAccountType::Bank,
        ]);
    }

    public function test_bank_account_can_be_created_and_must_link_an_asset(): void
    {
        $this->as($this->admin)->postJson('/api/v1/bank-accounts', [
            'code' => 'BA-2',
            'name' => 'Second Bank',
            'type' => BankAccountType::Bank->value,
            'chart_of_account_id' => $this->accounts->get('1020')->id,
        ])->assertStatus(201)->assertJsonPath('data.code', 'BA-2');

        $this->as($this->admin)->postJson('/api/v1/bank-accounts', [
            'code' => 'BA-3',
            'name' => 'Bad Bank',
            'type' => BankAccountType::Bank->value,
            'chart_of_account_id' => $this->accounts->get('4010')->id,
        ])->assertStatus(422)->assertJsonValidationErrors('chart_of_account_id');
    }

    public function test_bank_account_code_unique_per_campus(): void
    {
        $this->as($this->admin)->postJson('/api/v1/bank-accounts', [
            'code' => 'BA-1',
            'name' => 'Duplicate',
            'type' => BankAccountType::Bank->value,
            'chart_of_account_id' => $this->accounts->get('1020')->id,
        ])->assertStatus(422)->assertJsonValidationErrors('code');
    }

    public function test_reconciliation_computes_book_balance_and_difference(): void
    {
        $this->postToBank(100000, '2026-08-01');

        $this->as($this->admin)->postJson('/api/v1/bank-reconciliations', [
            'bank_account_id' => $this->bank->id,
            'statement_date' => '2026-09-30',
            'statement_closing_balance' => 99000,
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.book_balance', '100000.00')
            ->assertJsonPath('data.difference', '-1000.00')
            ->assertJsonPath('data.status', 'draft');
    }

    public function test_reconciliation_completes_only_when_balanced(): void
    {
        $this->postToBank(100000, '2026-08-01');

        $id = $this->as($this->admin)->postJson('/api/v1/bank-reconciliations', [
            'bank_account_id' => $this->bank->id,
            'statement_date' => '2026-09-30',
            'statement_closing_balance' => 99000,
        ])->assertStatus(201)->json('data.id');

        $this->as($this->admin)->postJson("/api/v1/bank-reconciliations/{$id}/complete")
            ->assertStatus(422)->assertJsonValidationErrors('difference');

        $this->as($this->admin)->putJson("/api/v1/bank-reconciliations/{$id}", [
            'statement_closing_balance' => 100000,
        ])->assertOk()->assertJsonPath('data.difference', '0.00');

        $this->as($this->admin)->postJson("/api/v1/bank-reconciliations/{$id}/complete")
            ->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.is_reconciled', true);
    }

    public function test_completed_reconciliation_is_locked(): void
    {
        $this->postToBank(100000, '2026-08-01');

        $id = $this->as($this->admin)->postJson('/api/v1/bank-reconciliations', [
            'bank_account_id' => $this->bank->id,
            'statement_date' => '2026-09-30',
            'statement_closing_balance' => 100000,
        ])->assertStatus(201)->json('data.id');

        $this->as($this->admin)->postJson("/api/v1/bank-reconciliations/{$id}/complete")->assertOk();

        $this->as($this->admin)->putJson("/api/v1/bank-reconciliations/{$id}", [
            'statement_closing_balance' => 1,
        ])->assertStatus(422)->assertJsonValidationErrors('status');
    }

    public function test_cash_book_statement_returns_running_balance(): void
    {
        $this->postToBank(100000, '2026-08-01');
        $this->postToBank(25000, '2026-08-15', credit: true);

        $this->as($this->admin)
            ->getJson("/api/v1/finance/reports/cash-book?bank_account_id={$this->bank->id}&from=2026-07-01&to=2026-09-30")
            ->assertOk()
            ->assertJsonPath('opening_balance', '0.00')
            ->assertJsonPath('closing_balance', '75000.00')
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.balance', '100000.00')
            ->assertJsonPath('data.1.balance', '75000.00');
    }

    public function test_cash_book_summary_lists_accounts(): void
    {
        $this->postToBank(100000, '2026-08-01');

        $this->as($this->admin)
            ->getJson('/api/v1/finance/reports/cash-book?to=2026-09-30')
            ->assertOk()
            ->assertJsonPath('totals.accounts', 1)
            ->assertJsonPath('totals.closing_balance', '100000.00')
            ->assertJsonPath('data.0.code', 'BA-1');
    }

    public function test_draft_entries_are_excluded_from_reconciliation(): void
    {
        $entry = JournalEntry::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'fiscal_year_id' => $this->fiscalYear->id,
            'reference' => 'JV/DRAFT/0001',
            'entry_date' => '2026-08-05',
            'status' => JournalStatus::Draft,
            'memo' => 'Not yet posted',
        ]);

        $entry->lines()->createMany([
            ['chart_of_account_id' => $this->accounts->get('1020')->id, 'line_no' => 1, 'debit' => 99999, 'credit' => 0],
            ['chart_of_account_id' => $this->accounts->get('3010')->id, 'line_no' => 2, 'debit' => 0, 'credit' => 99999],
        ]);

        $this->as($this->admin)->postJson('/api/v1/bank-reconciliations', [
            'bank_account_id' => $this->bank->id,
            'statement_date' => '2026-09-30',
            'statement_closing_balance' => 0,
        ])->assertStatus(201)->assertJsonPath('data.book_balance', '0.00');
    }

    public function test_bank_account_with_reconciliation_cannot_be_archived(): void
    {
        $this->postToBank(100000, '2026-08-01');

        $this->as($this->admin)->postJson('/api/v1/bank-reconciliations', [
            'bank_account_id' => $this->bank->id,
            'statement_date' => '2026-09-30',
            'statement_closing_balance' => 100000,
        ])->assertStatus(201);

        $this->as($this->admin)->deleteJson("/api/v1/bank-accounts/{$this->bank->id}")
            ->assertStatus(409);
    }

    public function test_teacher_cannot_manage_bank_accounts(): void
    {
        $this->as($this->teacher)->getJson('/api/v1/bank-accounts')->assertStatus(403);
        $this->as($this->teacher)->getJson('/api/v1/bank-reconciliations')->assertStatus(403);
    }

    private function postToBank(float $amount, string $date, bool $credit = false): void
    {
        $entry = JournalEntry::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'fiscal_year_id' => $this->fiscalYear->id,
            'reference' => 'JV/BANK/'.str_replace('-', '', $date),
            'entry_date' => $date,
            'status' => JournalStatus::Draft,
            'memo' => 'Bank movement',
        ]);

        $entry->lines()->createMany($credit ? [
            ['chart_of_account_id' => $this->accounts->get('3010')->id, 'line_no' => 1, 'debit' => $amount, 'credit' => 0],
            ['chart_of_account_id' => $this->accounts->get('1020')->id, 'line_no' => 2, 'debit' => 0, 'credit' => $amount],
        ] : [
            ['chart_of_account_id' => $this->accounts->get('1020')->id, 'line_no' => 1, 'debit' => $amount, 'credit' => 0],
            ['chart_of_account_id' => $this->accounts->get('3010')->id, 'line_no' => 2, 'debit' => 0, 'credit' => $amount],
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
