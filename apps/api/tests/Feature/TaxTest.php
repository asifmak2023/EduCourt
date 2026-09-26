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

class TaxTest extends TestCase
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

    public function test_tax_amount_is_derived_from_the_rule_rate(): void
    {
        $ruleId = $this->rule();

        $this->as($this->admin)->postJson('/api/v1/tax-returns', [
            'tax_rule_id' => $ruleId,
            'period_start' => '2026-07-01',
            'period_end' => '2026-07-31',
            'due_date' => '2026-08-15',
            'taxable_amount' => 100000,
        ])->assertStatus(201)
            ->assertJsonPath('data.tax_amount', '5000.00')
            ->assertJsonPath('data.status', 'pending');
    }

    public function test_filing_then_paying_a_tax_return_posts_and_settles_the_ledger(): void
    {
        $ruleId = $this->rule();
        $returnId = $this->as($this->admin)->postJson('/api/v1/tax-returns', [
            'tax_rule_id' => $ruleId,
            'period_start' => '2026-07-01',
            'period_end' => '2026-07-31',
            'due_date' => '2026-08-15',
            'taxable_amount' => 100000,
        ])->assertStatus(201)->json('data.id');

        $this->as($this->admin)->postJson("/api/v1/tax-returns/{$returnId}/file", [
            'reference' => 'FBR-JUL-2026',
        ])->assertOk()->assertJsonPath('data.status', 'filed');

        $this->as($this->admin)->postJson("/api/v1/tax-returns/{$returnId}/pay", [
            'method' => 'cash',
            'paid_on' => '2026-08-10',
        ])->assertOk()->assertJsonPath('data.status', 'paid');

        $this->assertSame(5000.0, (float) JournalLine::query()
            ->where('chart_of_account_id', $this->accounts->get('2140')->id)
            ->sum('debit'));

        $this->assertSame(5000.0, (float) JournalLine::query()
            ->where('chart_of_account_id', $this->accounts->get('1010')->id)
            ->sum('credit'));
    }

    public function test_required_documents_can_be_tracked_against_a_return(): void
    {
        $ruleId = $this->rule();
        $returnId = $this->as($this->admin)->postJson('/api/v1/tax-returns', [
            'tax_rule_id' => $ruleId,
            'period_start' => '2026-07-01',
            'period_end' => '2026-07-31',
            'due_date' => '2026-08-15',
            'taxable_amount' => 50000,
        ])->assertStatus(201)->json('data.id');

        $this->as($this->admin)->postJson("/api/v1/tax-returns/{$returnId}/documents", [
            'name' => 'Sales tax invoice register',
            'file_path' => 'tax/2026-07-register.pdf',
        ])->assertStatus(201)->assertJsonPath('data.name', 'Sales tax invoice register');

        $this->as($this->admin)->getJson("/api/v1/tax-returns/{$returnId}")
            ->assertOk()
            ->assertJsonCount(1, 'data.documents');
    }

    public function test_overdue_filter_lists_unpaid_returns_past_due(): void
    {
        $ruleId = $this->rule();
        $this->as($this->admin)->postJson('/api/v1/tax-returns', [
            'tax_rule_id' => $ruleId,
            'period_start' => '2026-05-01',
            'period_end' => '2026-05-31',
            'due_date' => '2026-06-15',
            'taxable_amount' => 20000,
        ])->assertStatus(201);

        $this->as($this->admin)->getJson('/api/v1/tax-returns?overdue=1')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    private function rule(): int
    {
        return $this->as($this->admin)->postJson('/api/v1/tax-rules', [
            'name' => 'Sales Tax 5%',
            'code' => 'ST5',
            'type' => 'sales_tax',
            'applies_to' => 'all',
            'rate' => 5,
        ])->assertStatus(201)->json('data.id');
    }

    private function as(User $user): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('t')->plainTextToken);
    }
}
