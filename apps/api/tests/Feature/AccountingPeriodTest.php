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

class AccountingPeriodTest extends TestCase
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

    public function test_generate_creates_monthly_periods(): void
    {
        $this->as($this->admin)->postJson('/api/v1/accounting-periods/generate', [
            'fiscal_year_id' => $this->fiscalYear->id,
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.0.name', 'Jul 2026')
            ->assertJsonPath('data.0.starts_on', '2026-07-01')
            ->assertJsonPath('data.0.ends_on', '2026-07-31')
            ->assertJsonPath('data.11.name', 'Jun 2027')
            ->assertJsonPath('data.11.ends_on', '2027-06-30');

        $this->as($this->admin)->getJson('/api/v1/accounting-periods')
            ->assertOk()
            ->assertJsonPath('meta.total', 12);
    }

    public function test_generate_is_idempotent(): void
    {
        $this->as($this->admin)->postJson('/api/v1/accounting-periods/generate', [
            'fiscal_year_id' => $this->fiscalYear->id,
        ])->assertStatus(201);

        $this->as($this->admin)->postJson('/api/v1/accounting-periods/generate', [
            'fiscal_year_id' => $this->fiscalYear->id,
        ])->assertStatus(201);

        $this->as($this->admin)->getJson('/api/v1/accounting-periods')
            ->assertOk()
            ->assertJsonPath('meta.total', 12);
    }

    public function test_duplicate_period_name_is_rejected(): void
    {
        $this->as($this->admin)->postJson('/api/v1/accounting-periods', [
            'fiscal_year_id' => $this->fiscalYear->id,
            'name' => 'Jul 2026',
            'starts_on' => '2026-07-01',
            'ends_on' => '2026-07-31',
        ])->assertStatus(201);

        $this->as($this->admin)->postJson('/api/v1/accounting-periods', [
            'fiscal_year_id' => $this->fiscalYear->id,
            'name' => 'Jul 2026',
            'starts_on' => '2026-07-01',
            'ends_on' => '2026-07-31',
        ])->assertStatus(422)->assertJsonValidationErrors('name');
    }

    public function test_posting_into_a_closed_period_is_blocked(): void
    {
        $this->generate();

        $july = $this->periodId('Jul 2026');
        $this->as($this->admin)->postJson("/api/v1/accounting-periods/{$july}/close")->assertOk();

        $entry = $this->draftEntry('2026-07-10');
        $this->as($this->admin)->postJson("/api/v1/journal-entries/{$entry}/post")
            ->assertStatus(422)
            ->assertJsonValidationErrors('entry_date');

        $august = $this->draftEntry('2026-08-10');
        $this->as($this->admin)->postJson("/api/v1/journal-entries/{$august}/post")
            ->assertOk()
            ->assertJsonPath('data.status', 'posted');
    }

    public function test_close_is_blocked_while_drafts_exist(): void
    {
        $this->generate();

        $this->draftEntry('2026-07-10');
        $july = $this->periodId('Jul 2026');

        $this->as($this->admin)->postJson("/api/v1/accounting-periods/{$july}/close")
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');
    }

    public function test_reopen_and_lock_lifecycle(): void
    {
        $this->generate();

        $july = $this->periodId('Jul 2026');

        $this->as($this->admin)->postJson("/api/v1/accounting-periods/{$july}/close")->assertOk();
        $this->as($this->admin)->postJson("/api/v1/accounting-periods/{$july}/reopen")
            ->assertOk()->assertJsonPath('data.status', 'open');

        $this->as($this->admin)->postJson("/api/v1/accounting-periods/{$july}/close")->assertOk();
        $this->as($this->admin)->postJson("/api/v1/accounting-periods/{$july}/lock")
            ->assertOk()->assertJsonPath('data.status', 'locked');

        $this->as($this->admin)->postJson("/api/v1/accounting-periods/{$july}/reopen")
            ->assertStatus(422)->assertJsonValidationErrors('status');

        $this->as($this->admin)->putJson("/api/v1/accounting-periods/{$july}", [
            'name' => 'Renamed',
        ])->assertStatus(422)->assertJsonValidationErrors('status');
    }

    private function generate(): void
    {
        $this->as($this->admin)->postJson('/api/v1/accounting-periods/generate', [
            'fiscal_year_id' => $this->fiscalYear->id,
        ])->assertStatus(201);
    }

    private function periodId(string $name): int
    {
        $rows = $this->as($this->admin)
            ->getJson('/api/v1/accounting-periods?per_page=100')
            ->assertOk()
            ->json('data');

        foreach ($rows as $row) {
            if ($row['name'] === $name) {
                return (int) $row['id'];
            }
        }

        $this->fail("Accounting period {$name} was not found.");
    }

    private function draftEntry(string $date): int
    {
        return (int) $this->as($this->admin)->postJson('/api/v1/journal-entries', [
            'fiscal_year_id' => $this->fiscalYear->id,
            'entry_date' => $date,
            'memo' => 'Period lock test',
            'lines' => [
                ['chart_of_account_id' => $this->accounts->get('1010')->id, 'debit' => 1000, 'credit' => 0],
                ['chart_of_account_id' => $this->accounts->get('4010')->id, 'debit' => 0, 'credit' => 1000],
            ],
        ])->assertStatus(201)->json('data.id');
    }

    private function as(User $user): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('t')->plainTextToken);
    }
}
