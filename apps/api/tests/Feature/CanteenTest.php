<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\Campus;
use App\Models\CanteenSale;
use App\Models\FiscalYear;
use App\Models\Institution;
use App\Models\JournalEntry;
use App\Models\Student;
use App\Models\StudentWallet;
use App\Models\User;
use App\Services\Accounting\DefaultChartOfAccounts;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CanteenTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $manager;

    private Student $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->institution = Institution::create(['name' => 'Test Trust', 'code' => 'TT']);
        $this->campus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus A', 'code' => 'A', 'type' => CampusType::School->value,
        ]);

        FiscalYear::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'FY 2026-2027', 'code' => 'FY27',
            'starts_on' => '2026-07-01', 'ends_on' => '2027-06-30',
            'status' => 'open', 'is_current' => true,
        ]);

        app(DefaultChartOfAccounts::class)->seed($this->campus);

        $this->manager = $this->actor(RoleName::CanteenManager);

        $this->student = Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'admission_no' => 'ADM-1', 'first_name' => 'Ali', 'last_name' => 'Raza',
            'gender' => 'male', 'status' => 'active',
        ]);
    }

    public function test_supplier_and_item_can_be_created_and_flagged_low_stock(): void
    {
        $supplier = $this->api($this->manager)->postJson('/api/v1/canteen/suppliers', [
            'name' => 'Fresh Foods', 'contact_person' => 'Imran',
            'phone' => '0300-1234567', 'email' => 'sales@fresh.test',
        ])->assertStatus(201)->json('data');

        $item = $this->api($this->manager)->postJson('/api/v1/canteen/items', [
            'name' => 'Chicken Patty', 'code' => 'PAT-01', 'category' => 'Snacks',
            'price' => 60, 'cost_price' => 35, 'reorder_level' => 10,
        ])->assertStatus(201)
            ->assertJsonPath('data.is_low_stock', true)
            ->json('data');

        $this->assertSame('PAT-01', $item['code']);

        $this->api($this->manager)
            ->getJson('/api/v1/canteen/items?low_stock=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $item['id']);

        $this->api($this->manager)
            ->getJson('/api/v1/canteen/suppliers?search=Fresh')
            ->assertOk()
            ->assertJsonPath('data.0.id', $supplier['id']);
    }

    public function test_stock_purchase_increases_stock_and_posts_inventory(): void
    {
        $item = $this->item(['cost_price' => 20, 'price' => 50]);

        $entry = $this->api($this->manager)->postJson('/api/v1/canteen/stock-entries', [
            'canteen_item_id' => $item['id'],
            'type' => 'purchase', 'quantity' => 100, 'unit_cost' => 20,
            'entry_date' => '2026-09-04',
        ])->assertStatus(201)
            ->assertJsonPath('data.balance_after', '100.00')
            ->json('data');

        $this->assertDatabaseHas('canteen_items', ['id' => $item['id'], 'stock_quantity' => 100]);
        $this->assertSame(2000.0, (float) $entry['total_cost']);
    }

    public function test_cash_sale_deducts_stock_and_posts_balanced_ledger(): void
    {
        $item = $this->item(['cost_price' => 20, 'price' => 50]);
        $this->stock($item['id'], 100, 20);

        $sale = $this->api($this->manager)->postJson('/api/v1/canteen/sales', [
            'payment_method' => 'cash',
            'items' => [['canteen_item_id' => $item['id'], 'quantity' => 2]],
            'sold_on' => '2026-09-05',
        ])->assertStatus(201)
            ->assertJsonPath('data.total', '100.00')
            ->assertJsonPath('data.cost_total', '40.00')
            ->json('data');

        $this->assertDatabaseHas('canteen_items', ['id' => $item['id'], 'stock_quantity' => 98]);

        $journal = JournalEntry::query()->findOrFail($sale['journal_entry_id']);
        $this->assertSame('140.00', (string) $journal->total_debit);
        $this->assertSame(4, $journal->lines()->count());
    }

    public function test_wallet_top_up_and_sale_move_the_balance_and_enforce_limit(): void
    {
        $item = $this->item(['cost_price' => 20, 'price' => 50]);
        $this->stock($item['id'], 100, 20);

        $wallet = $this->api($this->manager)
            ->getJson("/api/v1/canteen/students/{$this->student->id}/wallet")
            ->assertOk()
            ->json('data');

        $this->api($this->manager)->postJson("/api/v1/canteen/wallets/{$wallet['id']}/top-up", [
            'amount' => 500, 'method' => 'cash',
        ])->assertOk()->assertJsonPath('data.balance', '500.00');

        $this->api($this->manager)->postJson('/api/v1/canteen/sales', [
            'student_id' => $this->student->id,
            'payment_method' => 'wallet',
            'items' => [['canteen_item_id' => $item['id'], 'quantity' => 1]],
            'sold_on' => '2026-09-05',
        ])->assertStatus(201)->assertJsonPath('data.total', '50.00');

        $this->assertDatabaseHas('student_wallets', ['id' => $wallet['id'], 'balance' => 450]);

        StudentWallet::query()->whereKey($wallet['id'])->update(['daily_limit' => 60]);

        $this->api($this->manager)->postJson('/api/v1/canteen/sales', [
            'student_id' => $this->student->id,
            'payment_method' => 'wallet',
            'items' => [['canteen_item_id' => $item['id'], 'quantity' => 1]],
            'sold_on' => '2026-09-05',
        ])->assertStatus(422)->assertJsonValidationErrors('wallet');
    }

    public function test_voiding_a_sale_restores_stock_and_refunds_the_wallet(): void
    {
        $item = $this->item(['cost_price' => 20, 'price' => 50]);
        $this->stock($item['id'], 100, 20);

        $wallet = $this->api($this->manager)
            ->getJson("/api/v1/canteen/students/{$this->student->id}/wallet")
            ->json('data');
        $this->api($this->manager)->postJson("/api/v1/canteen/wallets/{$wallet['id']}/top-up", [
            'amount' => 200, 'method' => 'cash',
        ])->assertOk();

        $sale = $this->api($this->manager)->postJson('/api/v1/canteen/sales', [
            'student_id' => $this->student->id,
            'payment_method' => 'wallet',
            'items' => [['canteen_item_id' => $item['id'], 'quantity' => 2]],
            'sold_on' => '2026-09-05',
        ])->assertStatus(201)->json('data');

        $this->assertDatabaseHas('canteen_items', ['id' => $item['id'], 'stock_quantity' => 98]);

        $this->api($this->manager)
            ->postJson("/api/v1/canteen/sales/{$sale['id']}/void")
            ->assertOk()
            ->assertJsonPath('data.status', 'void');

        $this->assertDatabaseHas('canteen_items', ['id' => $item['id'], 'stock_quantity' => 100]);
        $this->assertDatabaseHas('student_wallets', ['id' => $wallet['id'], 'balance' => 200]);
        $this->assertSame('void', CanteenSale::query()->findOrFail($sale['id'])->status->value);
    }

    public function test_canteen_reports_summarise_sales_stock_and_wallets(): void
    {
        $item = $this->item(['cost_price' => 20, 'price' => 50]);
        $this->stock($item['id'], 100, 20);

        $this->api($this->manager)->postJson('/api/v1/canteen/sales', [
            'payment_method' => 'cash',
            'items' => [['canteen_item_id' => $item['id'], 'quantity' => 4]],
            'sold_on' => '2026-09-05',
        ])->assertStatus(201);

        $daily = $this->api($this->manager)
            ->getJson('/api/v1/canteen/reports/daily?from=2026-09-01&to=2026-09-30')
            ->assertOk()->json('data');
        $this->assertSame(1, $daily['totals']['bills']);
        $this->assertSame(200.0, (float) $daily['totals']['revenue']);

        $itemWise = $this->api($this->manager)
            ->getJson('/api/v1/canteen/reports/item-wise?from=2026-09-01&to=2026-09-30')
            ->assertOk()->json('data');
        $this->assertSame(4.0, (float) $itemWise[0]['quantity']);
        $this->assertSame(120.0, (float) $itemWise[0]['profit']);

        $profit = $this->api($this->manager)
            ->getJson('/api/v1/canteen/reports/profit-loss?from=2026-09-01&to=2026-09-30')
            ->assertOk()->json('data');
        $this->assertSame(200.0, (float) $profit['revenue']);
        $this->assertSame(80.0, (float) $profit['cost_of_goods_sold']);
        $this->assertSame(120.0, (float) $profit['net_profit']);

        $this->api($this->manager)
            ->getJson('/api/v1/canteen/reports/low-stock')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $walletSummary = $this->api($this->manager)
            ->getJson('/api/v1/canteen/reports/wallet-summary')
            ->assertOk()->json('data');
        $this->assertSame(0, $walletSummary['wallets']);
    }

    public function test_canteen_routes_require_permission(): void
    {
        $nobody = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);

        $this->api($nobody)
            ->getJson('/api/v1/canteen/items')
            ->assertStatus(403);

        $this->api($this->actor(RoleName::Librarian))
            ->getJson('/api/v1/canteen/items')
            ->assertStatus(403);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function item(array $overrides = []): array
    {
        return $this->api($this->manager)->postJson('/api/v1/canteen/items', array_merge([
            'name' => 'Chicken Patty', 'code' => 'PAT-01', 'category' => 'Snacks',
            'price' => 50, 'cost_price' => 20, 'reorder_level' => 5,
        ], $overrides))->assertStatus(201)->json('data');
    }

    private function stock(int $itemId, float $quantity, float $unitCost): void
    {
        $this->api($this->manager)->postJson('/api/v1/canteen/stock-entries', [
            'canteen_item_id' => $itemId,
            'type' => 'purchase', 'quantity' => $quantity, 'unit_cost' => $unitCost,
            'entry_date' => '2026-09-04',
        ])->assertStatus(201);
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

    private function api(User $user): self
    {
        $this->app['auth']->forgetGuards();

        $this->withToken($user->createToken('t')->plainTextToken);

        return $this;
    }
}
