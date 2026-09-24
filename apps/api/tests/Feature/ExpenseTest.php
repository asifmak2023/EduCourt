<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\PaymentMethod;
use App\Enums\RoleName;
use App\Models\Campus;
use App\Models\ChartOfAccount;
use App\Models\ExpenseCategory;
use App\Models\FiscalYear;
use App\Models\Institution;
use App\Models\JournalEntry;
use App\Models\User;
use App\Models\Vendor;
use App\Services\Accounting\DefaultChartOfAccounts;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Tests\TestCase;

class ExpenseTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private User $teacher;

    private FiscalYear $fiscalYear;

    /** @var Collection<string, ChartOfAccount> */
    private Collection $accounts;

    private Vendor $vendor;

    private ExpenseCategory $supplies;

    private ExpenseCategory $utilities;

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

        $this->vendor = Vendor::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'code' => 'VND-1',
            'name' => 'Stationery Mart',
            'payable_account_id' => $this->accounts->get('2010')->id,
        ]);

        $this->supplies = ExpenseCategory::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'code' => 'SUP',
            'name' => 'Teaching Supplies',
            'expense_account_id' => $this->accounts->get('5030')->id,
        ]);

        $this->utilities = ExpenseCategory::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'code' => 'UTL',
            'name' => 'Utilities',
            'expense_account_id' => $this->accounts->get('5020')->id,
        ]);
    }

    public function test_vendor_and_category_can_be_created(): void
    {
        $this->as($this->admin)->postJson('/api/v1/vendors', [
            'code' => 'VND-NEW', 'name' => 'New Vendor', 'phone' => '0300-0000000',
        ])->assertStatus(201)->assertJsonPath('data.code', 'VND-NEW');

        $this->as($this->admin)->postJson('/api/v1/expense-categories', [
            'code' => 'REP', 'name' => 'Repairs', 'expense_account_id' => $this->accounts->get('5040')->id,
        ])->assertStatus(201)->assertJsonPath('data.code', 'REP');
    }

    public function test_vendor_code_unique_per_campus(): void
    {
        $this->as($this->admin)->postJson('/api/v1/vendors', [
            'code' => 'VND-1', 'name' => 'Duplicate',
        ])->assertStatus(422)->assertJsonValidationErrors('code');
    }

    public function test_category_rejects_non_expense_account(): void
    {
        $this->as($this->admin)->postJson('/api/v1/expense-categories', [
            'code' => 'BAD', 'name' => 'Bad', 'expense_account_id' => $this->accounts->get('4010')->id,
        ])->assertStatus(422)->assertJsonValidationErrors('expense_account_id');
    }

    public function test_expense_draft_computes_total_from_lines(): void
    {
        $id = $this->createExpense(45000);

        $this->as($this->admin)->getJson("/api/v1/expenses/{$id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.total', '45000.00')
            ->assertJsonPath('data.outstanding', '45000.00')
            ->assertJsonCount(1, 'data.lines');
    }

    public function test_approval_posts_double_entry_to_payables(): void
    {
        $id = $this->createExpense(45000);

        $response = $this->as($this->admin)->postJson("/api/v1/expenses/{$id}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $entry = JournalEntry::query()->findOrFail($response->json('data.journal_entry_id'));

        $this->assertSame('posted', $entry->status->value);
        $this->assertSame('45000.00', (string) $entry->total_debit);

        $this->assertDatabaseHas('journal_lines', [
            'journal_entry_id' => $entry->id,
            'chart_of_account_id' => $this->accounts->get('5030')->id,
            'debit' => 45000,
        ]);

        $this->assertDatabaseHas('journal_lines', [
            'journal_entry_id' => $entry->id,
            'chart_of_account_id' => $this->accounts->get('2010')->id,
            'credit' => 45000,
        ]);
    }

    public function test_approved_expense_is_locked(): void
    {
        $id = $this->createExpense(45000);

        $this->as($this->admin)->postJson("/api/v1/expenses/{$id}/approve")->assertOk();

        $this->as($this->admin)->putJson("/api/v1/expenses/{$id}", ['bill_no' => 'X'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');
    }

    public function test_payment_partially_then_fully_settles_expense(): void
    {
        $id = $this->createExpense(45000);
        $this->as($this->admin)->postJson("/api/v1/expenses/{$id}/approve")->assertOk();

        $this->as($this->admin)->postJson('/api/v1/expense-payments', [
            'expense_id' => $id,
            'payment_date' => '2026-08-10',
            'amount' => 20000,
            'method' => PaymentMethod::BankTransfer->value,
        ])->assertStatus(201)->assertJsonPath('data.reference', 'PV-000001');

        $this->as($this->admin)->getJson("/api/v1/expenses/{$id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'partial')
            ->assertJsonPath('data.paid_amount', '20000.00')
            ->assertJsonPath('data.outstanding', '25000.00');

        $this->as($this->admin)->postJson('/api/v1/expense-payments', [
            'expense_id' => $id,
            'payment_date' => '2026-08-11',
            'amount' => 25000,
            'method' => PaymentMethod::Cash->value,
        ])->assertStatus(201);

        $this->as($this->admin)->getJson("/api/v1/expenses/{$id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'paid')
            ->assertJsonPath('data.outstanding', '0.00');
    }

    public function test_overpayment_is_rejected(): void
    {
        $id = $this->createExpense(45000);
        $this->as($this->admin)->postJson("/api/v1/expenses/{$id}/approve")->assertOk();

        $this->as($this->admin)->postJson('/api/v1/expense-payments', [
            'expense_id' => $id,
            'payment_date' => '2026-08-10',
            'amount' => 50000,
            'method' => PaymentMethod::Cash->value,
        ])->assertStatus(422)->assertJsonValidationErrors('amount');
    }

    public function test_voiding_payment_reopens_expense(): void
    {
        $id = $this->createExpense(45000);
        $this->as($this->admin)->postJson("/api/v1/expenses/{$id}/approve")->assertOk();

        $paymentId = $this->as($this->admin)->postJson('/api/v1/expense-payments', [
            'expense_id' => $id,
            'payment_date' => '2026-08-10',
            'amount' => 45000,
            'method' => PaymentMethod::Cash->value,
        ])->assertStatus(201)->json('data.id');

        $this->as($this->admin)->postJson("/api/v1/expense-payments/{$paymentId}/void")
            ->assertOk()
            ->assertJsonPath('data.is_voided', true);

        $this->as($this->admin)->getJson("/api/v1/expenses/{$id}")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.outstanding', '45000.00');
    }

    public function test_expense_cannot_be_voided_with_active_payments(): void
    {
        $id = $this->createExpense(45000);
        $this->as($this->admin)->postJson("/api/v1/expenses/{$id}/approve")->assertOk();

        $paymentId = $this->as($this->admin)->postJson('/api/v1/expense-payments', [
            'expense_id' => $id,
            'payment_date' => '2026-08-10',
            'amount' => 10000,
            'method' => PaymentMethod::Cash->value,
        ])->assertStatus(201)->json('data.id');

        $this->as($this->admin)->postJson("/api/v1/expenses/{$id}/void")
            ->assertStatus(422)->assertJsonValidationErrors('expense');

        $this->as($this->admin)->postJson("/api/v1/expense-payments/{$paymentId}/void")->assertOk();

        $this->as($this->admin)->postJson("/api/v1/expenses/{$id}/void")
            ->assertOk()
            ->assertJsonPath('data.status', 'void');
    }

    public function test_payables_report_ages_unpaid_bills(): void
    {
        $stationery = $this->createExpense(45000, '2026-08-05');
        $utility = $this->createExpense(30000, '2026-08-15', $this->utilities);

        $this->as($this->admin)->postJson("/api/v1/expenses/{$stationery}/approve")->assertOk();
        $this->as($this->admin)->postJson("/api/v1/expenses/{$utility}/approve")->assertOk();

        $this->as($this->admin)->getJson('/api/v1/finance/reports/payables?as_of=2026-09-30')
            ->assertOk()
            ->assertJsonPath('summary.expenses', 2)
            ->assertJsonPath('summary.outstanding', '75000.00')
            ->assertJsonPath('summary.buckets.days_31_60', '75000.00');
    }

    public function test_expense_summary_groups_by_category(): void
    {
        $stationery = $this->createExpense(45000, '2026-08-05');
        $utility = $this->createExpense(30000, '2026-08-15', $this->utilities);

        $this->as($this->admin)->postJson("/api/v1/expenses/{$stationery}/approve")->assertOk();
        $this->as($this->admin)->postJson("/api/v1/expenses/{$utility}/approve")->assertOk();

        $response = $this->as($this->admin)
            ->getJson('/api/v1/finance/reports/expenses?from=2026-07-01&to=2026-09-30')
            ->assertOk()
            ->assertJsonPath('totals.expenses', 2)
            ->assertJsonPath('totals.amount', '75000.00');

        $supplies = collect($response->json('by_category'))->firstWhere('code', 'SUP');

        $this->assertSame('45000.00', $supplies['total']);
    }

    public function test_teacher_cannot_manage_expenses(): void
    {
        $this->as($this->teacher)->getJson('/api/v1/expenses')->assertStatus(403);
        $this->as($this->teacher)->getJson('/api/v1/vendors')->assertStatus(403);
    }

    private function createExpense(float $amount, string $date = '2026-08-05', ?ExpenseCategory $category = null): int
    {
        $category ??= $this->supplies;

        return $this->as($this->admin)->postJson('/api/v1/expenses', [
            'vendor_id' => $this->vendor->id,
            'expense_date' => $date,
            'bill_no' => 'INV-1',
            'lines' => [
                [
                    'expense_category_id' => $category->id,
                    'amount' => $amount,
                    'description' => $category->name,
                ],
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
            'institution_id' => $this->campus->institution_id,
            'campus_id' => $this->campus->id,
        ]);
        $user->syncRoles([$role->value]);

        return $user;
    }
}
