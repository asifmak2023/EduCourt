<?php

namespace Tests\Feature;

use App\Enums\AccountType;
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

class FinanceTest extends TestCase
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
            'name' => '2026-2027', 'code' => 'FY-2026-27',
            'starts_on' => '2026-07-01', 'ends_on' => '2027-06-30',
            'status' => 'open', 'is_current' => true,
        ]);

        $this->accounts = app(DefaultChartOfAccounts::class)->seed($this->campus);
    }

    public function test_default_chart_of_accounts_is_seeded_per_campus(): void
    {
        $this->as($this->admin)
            ->getJson('/api/v1/chart-of-accounts?per_page=200')
            ->assertOk()
            ->assertJsonPath('meta.total', $this->accounts->count());

        $this->assertSame(AccountType::Asset, $this->accounts->get('1010')->account_type);
    }

    public function test_fiscal_year_can_be_created(): void
    {
        $this->as($this->admin)->postJson('/api/v1/fiscal-years', [
            'name' => '2027-2028',
            'code' => 'FY-2027-28',
            'starts_on' => '2027-07-01',
            'ends_on' => '2028-06-30',
            'is_current' => true,
        ])->assertStatus(201)->assertJsonPath('data.code', 'FY-2027-28');

        $this->assertFalse($this->fiscalYear->fresh()->is_current);
    }

    public function test_balanced_entry_can_be_posted(): void
    {
        $entry = $this->createEntry([
            ['chart_of_account_id' => $this->accounts->get('1010')->id, 'debit' => 50000],
            ['chart_of_account_id' => $this->accounts->get('4020')->id, 'credit' => 50000],
        ]);

        $this->as($this->admin)
            ->postJson("/api/v1/journal-entries/{$entry['id']}/post")
            ->assertOk()
            ->assertJsonPath('data.status', 'posted')
            ->assertJsonPath('data.total_debit', '50000.00')
            ->assertJsonPath('data.total_credit', '50000.00');
    }

    public function test_unbalanced_entry_cannot_be_posted(): void
    {
        $entry = $this->createEntry([
            ['chart_of_account_id' => $this->accounts->get('1010')->id, 'debit' => 50000],
            ['chart_of_account_id' => $this->accounts->get('4020')->id, 'credit' => 40000],
        ]);

        $this->as($this->admin)
            ->postJson("/api/v1/journal-entries/{$entry['id']}/post")
            ->assertStatus(422)
            ->assertJsonValidationErrors('lines');
    }

    public function test_posted_entry_is_immutable(): void
    {
        $entry = $this->createEntry([
            ['chart_of_account_id' => $this->accounts->get('1010')->id, 'debit' => 1000],
            ['chart_of_account_id' => $this->accounts->get('4040')->id, 'credit' => 1000],
        ]);

        $this->as($this->admin)->postJson("/api/v1/journal-entries/{$entry['id']}/post")->assertOk();

        $this->as($this->admin)->putJson("/api/v1/journal-entries/{$entry['id']}", [
            'fiscal_year_id' => $this->fiscalYear->id,
            'entry_date' => '2026-07-10',
            'lines' => [
                ['chart_of_account_id' => $this->accounts->get('1010')->id, 'debit' => 2000],
                ['chart_of_account_id' => $this->accounts->get('4040')->id, 'credit' => 2000],
            ],
        ])->assertStatus(409);

        $this->as($this->admin)
            ->deleteJson("/api/v1/journal-entries/{$entry['id']}")
            ->assertStatus(409);
    }

    public function test_reversal_offsets_the_original_entry(): void
    {
        $entry = $this->createEntry([
            ['chart_of_account_id' => $this->accounts->get('1010')->id, 'debit' => 5000],
            ['chart_of_account_id' => $this->accounts->get('4040')->id, 'credit' => 5000],
        ]);

        $this->as($this->admin)->postJson("/api/v1/journal-entries/{$entry['id']}/post")->assertOk();

        $reversal = $this->as($this->admin)
            ->postJson("/api/v1/journal-entries/{$entry['id']}/reverse")
            ->assertStatus(201)
            ->assertJsonPath('data.reversal_of_id', $entry['id'])
            ->assertJsonPath('data.status', 'posted');

        $this->assertNotSame($entry['id'], $reversal->json('data.id'));

        $this->getJson('/api/v1/journal-entries/'.$entry['id'])
            ->assertOk()
            ->assertJsonPath('data.status', 'reversed');

        $trial = $this->as($this->admin)
            ->getJson('/api/v1/finance/reports/trial-balance?fiscal_year_id='.$this->fiscalYear->id)
            ->assertOk();

        $this->assertSame($trial->json('totals.total_debit'), $trial->json('totals.total_credit'));
        $this->assertSame('0.00', collect($trial->json('data'))->firstWhere('code', '1010')['balance']);
    }

    public function test_entry_lines_must_use_leaf_accounts_on_the_same_campus(): void
    {
        $otherCampus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus B', 'code' => 'B', 'type' => CampusType::School->value,
        ]);

        $foreign = ChartOfAccount::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $otherCampus->id,
            'code' => '1010', 'name' => 'Foreign Cash',
            'account_type' => AccountType::Asset, 'normal_balance' => 'debit',
        ]);

        $payload = $this->entryPayload([
            ['chart_of_account_id' => $this->accounts->get('1010')->id, 'debit' => 100],
            ['chart_of_account_id' => $foreign->id, 'credit' => 100],
        ]);

        $this->as($this->admin)
            ->postJson('/api/v1/journal-entries', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('lines.1.chart_of_account_id');

        $groupAccount = $this->accounts->get('1000');

        $this->as($this->admin)
            ->postJson('/api/v1/journal-entries', $this->entryPayload([
                ['chart_of_account_id' => $this->accounts->get('1010')->id, 'debit' => 100],
                ['chart_of_account_id' => $groupAccount->id, 'credit' => 100],
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('lines.1.chart_of_account_id');
    }

    public function test_teacher_cannot_access_finance(): void
    {
        $this->as($this->teacher)
            ->getJson('/api/v1/chart-of-accounts')
            ->assertStatus(403);

        $this->as($this->teacher)
            ->postJson('/api/v1/fiscal-years', [
                'name' => 'X', 'code' => 'X',
                'starts_on' => '2026-01-01', 'ends_on' => '2026-12-31',
            ])
            ->assertStatus(403);
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

    /**
     * @param  array<int, array<string, mixed>>  $lines
     * @return array<string, mixed>
     */
    private function entryPayload(array $lines): array
    {
        return [
            'fiscal_year_id' => $this->fiscalYear->id,
            'entry_date' => '2026-07-05',
            'memo' => 'Test entry',
            'lines' => $lines,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $lines
     * @return array<string, mixed>
     */
    private function createEntry(array $lines): array
    {
        return $this->as($this->admin)
            ->postJson('/api/v1/journal-entries', $this->entryPayload($lines))
            ->assertStatus(201)
            ->json('data');
    }
}
