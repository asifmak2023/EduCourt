<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\DepreciationMethod;
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

class AssetLiabilityTest extends TestCase
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

    public function test_asset_can_be_created_and_links_an_asset_account(): void
    {
        $this->as($this->admin)->postJson('/api/v1/assets', [
            'code' => 'AST-1',
            'name' => 'Generator',
            'category' => 'Equipment',
            'acquisition_date' => '2026-01-01',
            'acquisition_cost' => 120000,
            'useful_life_months' => 12,
            'depreciation_method' => DepreciationMethod::StraightLine->value,
            'chart_of_account_id' => $this->accounts->get('1320')->id,
        ])
            ->assertStatus(201)
            ->assertJsonPath('data.code', 'AST-1')
            ->assertJsonPath('data.monthly_depreciation', '10000.00');

        $this->as($this->admin)->postJson('/api/v1/assets', [
            'code' => 'AST-2',
            'name' => 'Bad Asset',
            'acquisition_date' => '2026-01-01',
            'acquisition_cost' => 1000,
            'depreciation_method' => DepreciationMethod::None->value,
            'chart_of_account_id' => $this->accounts->get('4010')->id,
        ])->assertStatus(422)->assertJsonValidationErrors('chart_of_account_id');
    }

    public function test_asset_code_is_unique_per_campus(): void
    {
        $this->asset();

        $this->as($this->admin)->postJson('/api/v1/assets', [
            'code' => 'AST-1',
            'name' => 'Duplicate',
            'acquisition_date' => '2026-01-01',
            'acquisition_cost' => 1000,
            'depreciation_method' => DepreciationMethod::None->value,
        ])->assertStatus(422)->assertJsonValidationErrors('code');
    }

    public function test_asset_register_computes_depreciation_and_book_value(): void
    {
        $this->asset();

        $this->as($this->admin)
            ->getJson('/api/v1/finance/reports/asset-register?as_of=2026-09-01')
            ->assertOk()
            ->assertJsonPath('data.0.accumulated_depreciation', '80000.00')
            ->assertJsonPath('data.0.book_value', '40000.00')
            ->assertJsonPath('totals.book_value', '40000.00')
            ->assertJsonPath('by_category.0.category', 'Equipment');
    }

    public function test_asset_disposal_sets_book_value_to_proceeds(): void
    {
        $id = $this->asset();

        $this->as($this->admin)->postJson("/api/v1/assets/{$id}/dispose", [
            'disposed_on' => '2026-09-15',
            'disposal_proceeds' => 35000,
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'disposed')
            ->assertJsonPath('data.book_value', '35000.00');

        $this->as($this->admin)->postJson("/api/v1/assets/{$id}/dispose", [
            'disposed_on' => '2026-09-16',
        ])->assertStatus(422)->assertJsonValidationErrors('status');
    }

    public function test_liability_defaults_outstanding_and_can_be_settled(): void
    {
        $create = $this->as($this->admin)->postJson('/api/v1/liabilities', [
            'code' => 'LIA-1',
            'name' => 'Term Loan',
            'type' => 'loan',
            'lender' => 'Demo Bank',
            'principal_amount' => 500000,
            'interest_rate' => 9.5,
            'starts_on' => '2026-01-01',
            'matures_on' => '2031-01-01',
            'chart_of_account_id' => $this->accounts->get('2110')->id,
        ])->assertStatus(201)->assertJsonPath('data.outstanding_amount', '500000.00');

        $id = $create->json('data.id');

        $this->as($this->admin)->getJson('/api/v1/finance/reports/liability-register')
            ->assertOk()
            ->assertJsonPath('totals.outstanding', '500000.00')
            ->assertJsonPath('by_type.0.type', 'loan');

        $this->as($this->admin)->postJson("/api/v1/liabilities/{$id}/settle", [
            'settled_on' => '2026-09-30',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'settled')
            ->assertJsonPath('data.outstanding_amount', '0.00');

        $this->as($this->admin)->postJson("/api/v1/liabilities/{$id}/settle", [
            'settled_on' => '2026-10-01',
        ])->assertStatus(422)->assertJsonValidationErrors('status');
    }

    public function test_teacher_cannot_manage_registers(): void
    {
        $this->as($this->teacher)->getJson('/api/v1/assets')->assertStatus(403);
        $this->as($this->teacher)->getJson('/api/v1/liabilities')->assertStatus(403);
    }

    private function asset(): int
    {
        return $this->as($this->admin)->postJson('/api/v1/assets', [
            'code' => 'AST-1',
            'name' => 'Generator',
            'category' => 'Equipment',
            'acquisition_date' => '2026-01-01',
            'acquisition_cost' => 120000,
            'useful_life_months' => 12,
            'depreciation_method' => DepreciationMethod::StraightLine->value,
            'chart_of_account_id' => $this->accounts->get('1320')->id,
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
            'institution_id' => $this->campus->institution_id,
            'campus_id' => $this->campus->id,
        ]);
        $user->syncRoles([$role->value]);

        return $user;
    }
}
