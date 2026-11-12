<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\Campus;
use App\Models\Designation;
use App\Models\Institution;
use App\Models\SalaryComponent;
use App\Models\SalaryStructure;
use App\Models\StaffMember;
use App\Models\StaffSalary;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SalaryStructureTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $finance;

    private User $teacher;

    private Designation $designation;

    private SalaryComponent $allowance;

    private SalaryComponent $tax;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->institution = Institution::create(['name' => 'Test Trust', 'code' => 'TT']);
        $this->campus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus A', 'code' => 'A', 'type' => CampusType::School->value,
        ]);

        $this->finance = $this->actor(RoleName::FinanceHead);
        $this->teacher = $this->actor(RoleName::Teacher);

        $this->designation = Designation::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Senior Teacher', 'code' => 'ST',
        ]);

        $this->allowance = SalaryComponent::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'House Allowance', 'code' => 'HRA', 'type' => 'earning',
            'calculation' => 'fixed', 'default_amount' => 5000,
        ]);

        $this->tax = SalaryComponent::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Income Tax', 'code' => 'TAX', 'type' => 'deduction',
            'calculation' => 'percentage_of_basic', 'default_percentage' => 10,
        ]);
    }

    public function test_salary_structure_can_be_created_for_a_designation(): void
    {
        $structure = $this->as($this->finance)->postJson('/api/v1/salary-structures', [
            'designation_id' => $this->designation->id,
            'name' => 'Senior Teacher salary',
            'basic_salary' => 80000,
            'currency' => 'PKR',
            'effective_from' => '2026-07-01',
            'items' => [
                ['salary_component_id' => $this->allowance->id, 'amount' => 5000],
                ['salary_component_id' => $this->tax->id, 'percentage' => 10],
            ],
        ])->assertStatus(201)->json('data');

        $this->assertSame('Senior Teacher salary', $structure['name']);
        $this->assertSame((string) $this->designation->id, (string) $structure['designation_id']);
        $this->assertCount(2, $structure['items']);
        $this->assertSame('Senior Teacher', $structure['designation']['name']);
    }

    public function test_designation_can_only_have_one_structure_per_campus(): void
    {
        $this->as($this->finance)->postJson('/api/v1/salary-structures', [
            'designation_id' => $this->designation->id,
            'name' => 'First',
            'basic_salary' => 80000,
        ])->assertStatus(201);

        $this->as($this->finance)->postJson('/api/v1/salary-structures', [
            'designation_id' => $this->designation->id,
            'name' => 'Second',
            'basic_salary' => 90000,
        ])->assertStatus(422)->assertJsonValidationErrors('designation_id');
    }

    public function test_applying_structure_copies_pay_into_matching_staff(): void
    {
        $staff = $this->staff('EMP-0001', $this->designation);
        $other = $this->staff('EMP-0002', null);

        $structure = $this->structure();

        $result = $this->as($this->finance)
            ->postJson("/api/v1/salary-structures/{$structure->id}/apply")
            ->assertOk()
            ->json('data');

        $this->assertSame(1, $result['staff_count']);

        $salary = StaffSalary::query()->where('staff_member_id', $staff->id)->firstOrFail();
        $this->assertSame('80000.00', $salary->basic_salary);
        $this->assertSame($structure->id, $salary->salary_structure_id);
        $this->assertCount(2, $salary->items);

        $this->assertNull(StaffSalary::query()->where('staff_member_id', $other->id)->first());
    }

    public function test_applying_with_explicit_staff_ids_overrides_designation(): void
    {
        $staff = $this->staff('EMP-0001', $this->designation);
        $other = $this->staff('EMP-0002', null);

        $structure = $this->structure();

        $result = $this->as($this->finance)
            ->postJson("/api/v1/salary-structures/{$structure->id}/apply", [
                'staff_member_ids' => [$other->id],
            ])
            ->assertOk()
            ->json('data');

        $this->assertSame(1, $result['staff_count']);
        $this->assertNotNull(StaffSalary::query()->where('staff_member_id', $other->id)->first());
        $this->assertNull(StaffSalary::query()->where('staff_member_id', $staff->id)->first());
    }

    public function test_applying_twice_does_not_duplicate_the_same_effective_date(): void
    {
        $staff = $this->staff('EMP-0001', $this->designation);
        $structure = $this->structure();

        $this->as($this->finance)
            ->postJson("/api/v1/salary-structures/{$structure->id}/apply", [
                'effective_from' => '2026-07-01',
            ])
            ->assertOk();

        $this->as($this->finance)
            ->postJson("/api/v1/salary-structures/{$structure->id}/apply", [
                'effective_from' => '2026-07-01',
            ])
            ->assertOk();

        $this->assertSame(
            1,
            StaffSalary::query()->where('staff_member_id', $staff->id)->count()
        );
        $this->assertSame(2, StaffSalary::query()->firstOrFail()->items()->count());
    }

    public function test_structure_update_replaces_component_lines(): void
    {
        $structure = $this->structure();

        $updated = $this->as($this->finance)
            ->putJson("/api/v1/salary-structures/{$structure->id}", [
                'name' => 'Senior Teacher salary (revised)',
                'items' => [
                    ['salary_component_id' => $this->allowance->id, 'amount' => 7000],
                ],
            ])
            ->assertOk()
            ->json('data');

        $this->assertSame('Senior Teacher salary (revised)', $updated['name']);
        $this->assertCount(1, $updated['items']);
        $this->assertSame('7000.00', $updated['items'][0]['amount']);
    }

    public function test_teacher_cannot_manage_salary_structures(): void
    {
        $this->as($this->teacher)->getJson('/api/v1/salary-structures')->assertStatus(403);

        $this->as($this->teacher)->postJson('/api/v1/salary-structures', [
            'designation_id' => $this->designation->id,
            'name' => 'Nope',
            'basic_salary' => 1,
        ])->assertStatus(403);
    }

    public function test_structure_can_be_resolved_for_a_designation(): void
    {
        $structure = $this->structure();

        $this->as($this->finance)
            ->getJson("/api/v1/salary-structures/resolve?designation_id={$this->designation->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $structure->id);
    }

    public function test_finance_head_can_read_designations_for_the_structure_form(): void
    {
        $this->as($this->finance)
            ->getJson('/api/v1/designations')
            ->assertOk()
            ->assertJsonPath('data.0.id', $this->designation->id);
    }

    public function test_resolve_and_apply_use_the_latest_revision(): void
    {
        $staff = $this->staff('EMP-0001', $this->designation);
        $structure = $this->structure();

        $revised = $this->as($this->finance)
            ->postJson("/api/v1/salary-structures/{$structure->id}/revise", [
                'increment_type' => 'percent',
                'increment_value' => 10,
            ])
            ->assertStatus(201)
            ->json('data');

        $resolved = $this->as($this->finance)
            ->getJson("/api/v1/salary-structures/resolve?designation_id={$this->designation->id}")
            ->assertOk()
            ->json('data');

        $this->assertSame($revised['id'], $resolved['id']);

        $this->as($this->finance)
            ->postJson("/api/v1/salary-structures/{$revised['id']}/apply", [
                'effective_from' => '2027-01-01',
            ])
            ->assertOk();

        $salary = StaffSalary::query()->where('staff_member_id', $staff->id)->firstOrFail();
        $this->assertSame('88000.00', $salary->basic_salary);
        $this->assertSame($revised['id'], $salary->salary_structure_id);
    }

    public function test_revising_with_percent_increment_supersedes_and_raises_basic(): void
    {
        $structure = $this->structure();

        $revised = $this->as($this->finance)
            ->postJson("/api/v1/salary-structures/{$structure->id}/revise", [
                'increment_type' => 'percent',
                'increment_value' => 10,
                'effective_from' => '2027-07-01',
            ])
            ->assertStatus(201)
            ->json('data');

        $this->assertSame(2, $revised['version']);
        $this->assertTrue($revised['is_current']);
        $this->assertSame('88000.00', $revised['basic_salary']);
        $this->assertCount(2, $revised['items']);

        $structure->refresh();
        $this->assertSame($revised['id'], $structure->superseded_by_id);
        $this->assertFalse($structure->isCurrent());
    }

    public function test_revising_with_fixed_increment_raises_basic(): void
    {
        $structure = $this->structure();

        $revised = $this->as($this->finance)
            ->postJson("/api/v1/salary-structures/{$structure->id}/revise", [
                'increment_type' => 'fixed',
                'increment_value' => 5000,
            ])
            ->assertStatus(201)
            ->json('data');

        $this->assertSame('85000.00', $revised['basic_salary']);
    }

    public function test_revision_can_override_basic_and_items(): void
    {
        $structure = $this->structure();

        $revised = $this->as($this->finance)
            ->postJson("/api/v1/salary-structures/{$structure->id}/revise", [
                'basic_salary' => 100000,
                'items' => [
                    ['salary_component_id' => $this->allowance->id, 'amount' => 9000],
                ],
            ])
            ->assertStatus(201)
            ->json('data');

        $this->assertSame('100000.00', $revised['basic_salary']);
        $this->assertCount(1, $revised['items']);
        $this->assertSame('9000.00', $revised['items'][0]['amount']);
    }

    public function test_superseded_version_cannot_be_edited_or_revised_again(): void
    {
        $structure = $this->structure();

        $this->as($this->finance)
            ->postJson("/api/v1/salary-structures/{$structure->id}/revise", ['increment_value' => 1, 'increment_type' => 'percent'])
            ->assertStatus(201);

        $this->as($this->finance)
            ->putJson("/api/v1/salary-structures/{$structure->id}", ['name' => 'Nope'])
            ->assertStatus(422);

        $this->as($this->finance)
            ->postJson("/api/v1/salary-structures/{$structure->id}/revise", ['increment_value' => 2, 'increment_type' => 'percent'])
            ->assertStatus(422);
    }

    public function test_index_returns_only_current_versions_by_default(): void
    {
        $structure = $this->structure();

        $this->as($this->finance)
            ->postJson("/api/v1/salary-structures/{$structure->id}/revise", ['increment_value' => 5, 'increment_type' => 'percent'])
            ->assertStatus(201);

        $default = $this->as($this->finance)
            ->getJson('/api/v1/salary-structures')
            ->assertOk()
            ->json('data');

        $this->assertCount(1, $default);
        $this->assertSame(2, $default[0]['version']);

        $withHistory = $this->as($this->finance)
            ->getJson('/api/v1/salary-structures?include_history=1')
            ->assertOk()
            ->json('data');

        $this->assertCount(2, $withHistory);
    }

    public function test_staff_salary_increment_creates_new_effective_row(): void
    {
        $staff = $this->staff('EMP-0001', $this->designation);

        $salary = StaffSalary::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'staff_member_id' => $staff->id,
            'basic_salary' => 60000,
            'currency' => 'PKR',
            'effective_from' => '2026-07-01',
            'is_active' => true,
        ]);
        $salary->items()->create([
            'salary_component_id' => $this->allowance->id,
            'amount' => 3000,
        ]);

        $next = $this->as($this->finance)
            ->postJson("/api/v1/staff-salaries/{$salary->id}/increment", [
                'increment_type' => 'percent',
                'increment_value' => 20,
                'effective_from' => '2027-01-01',
            ])
            ->assertStatus(201)
            ->json('data');

        $this->assertSame('72000.00', $next['basic_salary']);
        $this->assertSame('2027-01-01', $next['effective_from']);

        $salary->refresh();
        $this->assertSame('2026-12-31', $salary->effective_to->toDateString());

        $this->assertSame(2, StaffSalary::query()->where('staff_member_id', $staff->id)->count());
        $this->assertCount(1, $next['items']);
    }

    public function test_staff_salary_increment_requires_a_later_effective_date(): void
    {
        $staff = $this->staff('EMP-0001', $this->designation);

        $salary = StaffSalary::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'staff_member_id' => $staff->id,
            'basic_salary' => 60000,
            'currency' => 'PKR',
            'effective_from' => '2026-07-01',
            'is_active' => true,
        ]);

        $this->as($this->finance)
            ->postJson("/api/v1/staff-salaries/{$salary->id}/increment", [
                'increment_type' => 'percent',
                'increment_value' => 10,
                'effective_from' => '2026-07-01',
            ])
            ->assertStatus(422);
    }

    public function test_staff_salary_fixed_increment(): void
    {
        $staff = $this->staff('EMP-0001', $this->designation);

        $salary = StaffSalary::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'staff_member_id' => $staff->id,
            'basic_salary' => 60000,
            'currency' => 'PKR',
            'effective_from' => '2026-07-01',
            'is_active' => true,
        ]);

        $next = $this->as($this->finance)
            ->postJson("/api/v1/staff-salaries/{$salary->id}/increment", [
                'increment_type' => 'fixed',
                'increment_value' => 2500,
                'effective_from' => '2027-01-01',
            ])
            ->assertStatus(201)
            ->json('data');

        $this->assertSame('62500.00', $next['basic_salary']);
    }

    private function structure(): SalaryStructure
    {
        $structure = SalaryStructure::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'designation_id' => $this->designation->id,
            'name' => 'Senior Teacher salary',
            'basic_salary' => 80000,
            'currency' => 'PKR',
            'effective_from' => '2026-07-01',
            'is_active' => true,
        ]);

        $structure->items()->create([
            'salary_component_id' => $this->allowance->id,
            'amount' => 5000,
            'sort_order' => 0,
        ]);
        $structure->items()->create([
            'salary_component_id' => $this->tax->id,
            'percentage' => 10,
            'sort_order' => 1,
        ]);

        return $structure;
    }

    private function staff(string $employeeNo, ?Designation $designation): StaffMember
    {
        return StaffMember::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'designation_id' => $designation?->id,
            'employee_no' => $employeeNo,
            'first_name' => 'Ayesha', 'last_name' => 'Malik',
            'joining_date' => '2026-01-01', 'status' => 'active',
            'employment_type' => 'permanent',
        ]);
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

    private function as(User $user): self
    {
        $this->app['auth']->forgetGuards();
        $this->withToken($user->createToken('t')->plainTextToken);

        return $this;
    }
}
