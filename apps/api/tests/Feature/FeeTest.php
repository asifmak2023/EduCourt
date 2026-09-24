<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ChartOfAccount;
use App\Models\ClassRoom;
use App\Models\FeeHead;
use App\Models\Institution;
use App\Models\Stage;
use App\Models\User;
use App\Services\Accounting\DefaultChartOfAccounts;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Tests\TestCase;

class FeeTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private User $teacher;

    private AcademicYear $year;

    private ClassRoom $class;

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

        $this->year = AcademicYear::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => '2026-2027', 'code' => 'AY',
            'starts_on' => '2026-04-01', 'ends_on' => '2027-03-31', 'status' => 'active',
        ]);

        $stage = Stage::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Primary', 'code' => 'PRI', 'sequence' => 1,
        ]);

        $this->class = ClassRoom::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'stage_id' => $stage->id, 'name' => 'Class 1', 'code' => 'C1',
        ]);

        $this->accounts = app(DefaultChartOfAccounts::class)->seed($this->campus);
    }

    public function test_fee_head_can_be_created_with_an_income_account(): void
    {
        $this->as($this->admin)->postJson('/api/v1/fee-heads', [
            'code' => 'TUI',
            'name' => 'Tuition Fee',
            'income_account_id' => $this->accounts->get('4010')->id,
        ])->assertStatus(201)->assertJsonPath('data.code', 'TUI');
    }

    public function test_fee_head_rejects_non_income_or_group_accounts(): void
    {
        $this->as($this->admin)->postJson('/api/v1/fee-heads', [
            'code' => 'BAD',
            'name' => 'Bad Head',
            'income_account_id' => $this->accounts->get('1010')->id,
        ])->assertStatus(422)->assertJsonValidationErrors('income_account_id');

        $this->as($this->admin)->postJson('/api/v1/fee-heads', [
            'code' => 'BADC',
            'name' => 'Bad Group Head',
            'income_account_id' => $this->accounts->get('4000')->id,
        ])->assertStatus(422)->assertJsonValidationErrors('income_account_id');
    }

    public function test_fee_plan_can_be_created_with_items_and_installments(): void
    {
        $tuition = $this->feeHead('TUI');
        $transport = $this->feeHead('TRA');

        $this->as($this->admin)
            ->postJson('/api/v1/fee-plans', $this->planPayload([
                ['fee_head_id' => $tuition->id, 'amount' => 30000],
                ['fee_head_id' => $transport->id, 'amount' => 4000, 'is_optional' => true],
            ]))
            ->assertStatus(201)
            ->assertJsonCount(3, 'data.installments')
            ->assertJsonPath('data.totals.required', '30000.00')
            ->assertJsonPath('data.totals.optional', '4000.00')
            ->assertJsonPath('data.totals.grand', '34000.00');
    }

    public function test_installment_percentages_must_total_one_hundred(): void
    {
        $tuition = $this->feeHead('TUI');

        $this->as($this->admin)
            ->postJson('/api/v1/fee-plans', $this->planPayload(
                [['fee_head_id' => $tuition->id, 'amount' => 30000]],
                installments: [
                    ['label' => 'One', 'due_date' => '2026-07-10', 'percentage' => 50],
                    ['label' => 'Two', 'due_date' => '2026-10-10', 'percentage' => 30],
                ],
            ))
            ->assertStatus(422)
            ->assertJsonValidationErrors('installments');
    }

    public function test_fee_plan_rejects_fee_head_from_another_campus(): void
    {
        $other = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus B', 'code' => 'B', 'type' => CampusType::School->value,
        ]);
        $otherAccounts = app(DefaultChartOfAccounts::class)->seed($other);

        $foreignHead = FeeHead::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $other->id,
            'code' => 'TUI',
            'name' => 'Foreign Tuition',
            'income_account_id' => $otherAccounts->get('4010')->id,
        ]);

        $this->as($this->admin)
            ->postJson('/api/v1/fee-plans', $this->planPayload([
                ['fee_head_id' => $foreignHead->id, 'amount' => 1000],
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('items.0.fee_head_id');
    }

    public function test_update_replaces_fee_plan_items(): void
    {
        $tuition = $this->feeHead('TUI');
        $misc = $this->feeHead('MSC');

        $plan = $this->as($this->admin)
            ->postJson('/api/v1/fee-plans', $this->planPayload([
                ['fee_head_id' => $tuition->id, 'amount' => 30000],
            ]))
            ->assertStatus(201)
            ->json('data');

        $this->as($this->admin)
            ->putJson("/api/v1/fee-plans/{$plan['id']}", $this->planPayload([
                ['fee_head_id' => $misc->id, 'amount' => 2500],
            ]))
            ->assertOk()
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.fee_head_id', $misc->id)
            ->assertJsonPath('data.totals.required', '2500.00');
    }

    public function test_teacher_cannot_manage_fees(): void
    {
        $this->as($this->teacher)
            ->getJson('/api/v1/fee-heads')
            ->assertStatus(403);

        $this->as($this->teacher)
            ->postJson('/api/v1/fee-plans', $this->planPayload([]))
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

    private function feeHead(string $code): FeeHead
    {
        return FeeHead::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'code' => $code,
            'name' => $code,
        ]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @param  array<int, array<string, mixed>>  $installments
     * @return array<string, mixed>
     */
    private function planPayload(array $items, array $installments = []): array
    {
        if ($installments === []) {
            $installments = [
                ['label' => 'First', 'due_date' => '2026-07-10', 'percentage' => 40],
                ['label' => 'Second', 'due_date' => '2026-10-10', 'percentage' => 30],
                ['label' => 'Third', 'due_date' => '2027-01-10', 'percentage' => 30],
            ];
        }

        return [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'name' => 'Standard Fee',
            'items' => $items,
            'installments' => $installments,
        ];
    }
}
