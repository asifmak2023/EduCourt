<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\Campus;
use App\Models\ChartOfAccount;
use App\Models\FiscalYear;
use App\Models\Institution;
use App\Models\JournalLine;
use App\Models\User;
use App\Services\Accounting\DefaultChartOfAccounts;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Tests\TestCase;

class OtherIncomeTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

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

        FiscalYear::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'FY 2026-2027', 'code' => 'FY27',
            'starts_on' => '2026-07-01', 'ends_on' => '2027-06-30',
            'status' => 'open', 'is_current' => true,
        ]);

        $this->accounts = app(DefaultChartOfAccounts::class)->seed($this->campus);
    }

    public function test_income_source_can_be_created_and_other_income_posts_to_the_ledger(): void
    {
        $sourceId = $this->as($this->admin)->postJson('/api/v1/income-sources', [
            'name' => 'Alumni Donations',
            'code' => 'DON-01',
            'category' => 'donation',
        ])->assertStatus(201)->json('data.id');

        $income = $this->as($this->admin)->postJson('/api/v1/other-incomes', [
            'income_source_id' => $sourceId,
            'received_on' => '2026-08-15',
            'amount' => 25000,
            'method' => 'cash',
            'payer_name' => 'Old Boys Association',
        ])->assertStatus(201)
            ->assertJsonPath('data.status', 'posted')
            ->json('data');

        $this->assertStringStartsWith('INC-', $income['receipt_no']);
        $this->assertNotNull($income['journal_entry_id']);

        $this->assertSame(25000.0, (float) JournalLine::query()
            ->where('chart_of_account_id', $this->accounts->get('1010')->id)
            ->sum('debit'));

        $this->assertSame(25000.0, (float) JournalLine::query()
            ->where('chart_of_account_id', $this->accounts->get('4060')->id)
            ->sum('credit'));
    }

    public function test_income_source_can_override_the_posting_account(): void
    {
        $sourceId = $this->as($this->admin)->postJson('/api/v1/income-sources', [
            'name' => 'Canteen Sales',
            'code' => 'SAL-01',
            'category' => 'sale',
            'income_account_id' => $this->accounts->get('4070')->id,
        ])->assertStatus(201)->json('data.id');

        $this->as($this->admin)->postJson('/api/v1/other-incomes', [
            'income_source_id' => $sourceId,
            'received_on' => '2026-08-16',
            'amount' => 4000,
            'method' => 'bank_transfer',
        ])->assertStatus(201);

        $this->assertSame(4000.0, (float) JournalLine::query()
            ->where('chart_of_account_id', $this->accounts->get('1020')->id)
            ->sum('debit'));

        $this->assertSame(4000.0, (float) JournalLine::query()
            ->where('chart_of_account_id', $this->accounts->get('4070')->id)
            ->sum('credit'));
    }

    public function test_voiding_other_income_reverses_the_ledger(): void
    {
        $sourceId = $this->as($this->admin)->postJson('/api/v1/income-sources', [
            'name' => 'Commission',
            'code' => 'COM-01',
            'category' => 'commission',
        ])->assertStatus(201)->json('data.id');

        $incomeId = $this->as($this->admin)->postJson('/api/v1/other-incomes', [
            'income_source_id' => $sourceId,
            'received_on' => '2026-08-17',
            'amount' => 1500,
            'method' => 'cash',
        ])->assertStatus(201)->json('data.id');

        $this->as($this->admin)->postJson("/api/v1/other-incomes/{$incomeId}/void", [
            'memo' => 'Recorded twice.',
        ])->assertOk()->assertJsonPath('data.status', 'void');

        $this->assertSame(0.0, (float) JournalLine::query()
            ->where('chart_of_account_id', $this->accounts->get('4080')->id)
            ->sum('credit') - (float) JournalLine::query()
            ->where('chart_of_account_id', $this->accounts->get('4080')->id)
            ->sum('debit'));
    }

    private function as(User $user): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('t')->plainTextToken);
    }
}
