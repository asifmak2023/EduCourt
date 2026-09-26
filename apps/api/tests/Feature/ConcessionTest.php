<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\ConcessionStatus;
use App\Enums\ConcessionType;
use App\Enums\DiscountType;
use App\Enums\Gender;
use App\Enums\RoleName;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ChartOfAccount;
use App\Models\ClassRoom;
use App\Models\ConcessionPolicy;
use App\Models\FeeHead;
use App\Models\FeePlan;
use App\Models\FeeVoucher;
use App\Models\FiscalYear;
use App\Models\Guardian;
use App\Models\Institution;
use App\Models\Section;
use App\Models\Stage;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\User;
use App\Services\Accounting\DefaultChartOfAccounts;
use App\Services\Concessions\ConcessionService;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Tests\TestCase;

class ConcessionTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private AcademicYear $year;

    private ClassRoom $class;

    private Section $section;

    /** @var Collection<string, ChartOfAccount> */
    private Collection $accounts;

    private Student $studentOne;

    private Student $studentTwo;

    private FeePlan $plan;

    private ConcessionService $concessions;

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

        $this->year = AcademicYear::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => '2026-2027', 'code' => 'AY',
            'starts_on' => '2026-04-01', 'ends_on' => '2027-03-31',
            'status' => 'active', 'is_current' => true,
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

        $this->section = Section::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'class_room_id' => $this->class->id, 'name' => 'A',
        ]);

        FiscalYear::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'FY 2026-2027', 'code' => 'FY27',
            'starts_on' => '2026-07-01', 'ends_on' => '2027-06-30',
            'status' => 'open', 'is_current' => true,
        ]);

        $this->accounts = app(DefaultChartOfAccounts::class)->seed($this->campus);

        $this->studentOne = $this->student('ADM-1', 'Ali', Gender::Male);
        $this->studentTwo = $this->student('ADM-2', 'Sara', Gender::Female);

        $this->plan = $this->feePlan();

        $this->concessions = app(ConcessionService::class);
    }

    public function test_policy_can_be_created_and_listed(): void
    {
        $this->as($this->admin)->postJson('/api/v1/concession-policies', [
            'name' => 'Sibling Concession',
            'code' => 'SIB10',
            'type' => ConcessionType::Sibling->value,
            'discount_type' => DiscountType::Percentage->value,
            'value' => 10,
            'criteria' => ['min_siblings' => 1],
        ])->assertStatus(201)
            ->assertJsonPath('data.code', 'SIB10')
            ->assertJsonPath('data.type', ConcessionType::Sibling->value);

        $this->as($this->admin)->getJson('/api/v1/concession-policies')
            ->assertOk()
            ->assertJsonPath('data.0.code', 'SIB10');
    }

    public function test_sibling_criteria_matches_only_when_a_guardian_is_shared(): void
    {
        $this->policy(['code' => 'SIB10', 'type' => ConcessionType::Sibling, 'criteria' => ['min_siblings' => 1]]);

        $this->assertSame(0.0, $this->concessions->annualConcessionFor($this->studentOne->id, $this->year->id, $this->class->id, 20000.0));

        $this->shareGuardian($this->studentOne, $this->studentTwo);

        $this->assertSame(2000.0, $this->concessions->annualConcessionFor($this->studentOne->id, $this->year->id, $this->class->id, 20000.0));
    }

    public function test_non_stackable_policies_use_the_largest_single_value(): void
    {
        $this->policy(['code' => 'A', 'discount_type' => DiscountType::Fixed, 'value' => 1000]);
        $this->policy(['code' => 'B', 'discount_type' => DiscountType::Fixed, 'value' => 1500]);

        $this->assertSame(1500.0, $this->concessions->annualConcessionFor($this->studentOne->id, $this->year->id, $this->class->id, 20000.0));
    }

    public function test_stackable_and_non_stackable_amounts_combine_and_are_capped(): void
    {
        $this->policy(['code' => 'A', 'discount_type' => DiscountType::Fixed, 'value' => 1000, 'is_stackable' => true]);
        $this->policy(['code' => 'B', 'discount_type' => DiscountType::Fixed, 'value' => 1500]);

        $this->assertSame(2500.0, $this->concessions->annualConcessionFor($this->studentOne->id, $this->year->id, $this->class->id, 20000.0));
        $this->assertSame(2000.0, $this->concessions->annualConcessionFor($this->studentOne->id, $this->year->id, $this->class->id, 2000.0));
    }

    public function test_percentage_policy_respects_the_max_amount_cap(): void
    {
        $this->policy(['code' => 'CAP', 'discount_type' => DiscountType::Percentage, 'value' => 50, 'max_amount' => 3000]);

        $this->assertSame(3000.0, $this->concessions->annualConcessionFor($this->studentOne->id, $this->year->id, $this->class->id, 20000.0));
    }

    public function test_approval_gated_policy_only_applies_after_approval(): void
    {
        $policy = $this->policy([
            'code' => 'NEED500',
            'type' => ConcessionType::NeedBased,
            'discount_type' => DiscountType::Fixed,
            'value' => 500,
            'requires_approval' => true,
        ]);

        $this->assertSame(0.0, $this->concessions->annualConcessionFor($this->studentOne->id, $this->year->id, $this->class->id, 20000.0));

        $concessionId = $this->as($this->admin)->postJson('/api/v1/concessions', [
            'student_id' => $this->studentOne->id,
            'academic_year_id' => $this->year->id,
            'concession_policy_id' => $policy->id,
        ])->assertStatus(201)
            ->assertJsonPath('data.status', ConcessionStatus::Pending->value)
            ->json('data.id');

        $this->as($this->admin)->postJson("/api/v1/concessions/{$concessionId}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', ConcessionStatus::Approved->value)
            ->assertJsonPath('data.amount', '500.00');

        $this->assertSame(500.0, $this->concessions->annualConcessionFor($this->studentOne->id, $this->year->id, $this->class->id, 20000.0));
    }

    public function test_rejected_concession_does_not_apply(): void
    {
        $policy = $this->policy([
            'code' => 'NEED500',
            'discount_type' => DiscountType::Fixed,
            'value' => 500,
            'requires_approval' => true,
        ]);

        $concessionId = $this->as($this->admin)->postJson('/api/v1/concessions', [
            'student_id' => $this->studentOne->id,
            'academic_year_id' => $this->year->id,
            'concession_policy_id' => $policy->id,
        ])->assertStatus(201)->json('data.id');

        $this->as($this->admin)->postJson("/api/v1/concessions/{$concessionId}/reject")->assertOk();

        $this->assertSame(0.0, $this->concessions->annualConcessionFor($this->studentOne->id, $this->year->id, $this->class->id, 20000.0));
    }

    public function test_fee_voucher_generation_applies_concession_discounts(): void
    {
        $this->policy(['code' => 'SIB10', 'type' => ConcessionType::Sibling, 'criteria' => ['min_siblings' => 1]]);
        $this->shareGuardian($this->studentOne, $this->studentTwo);

        $this->as($this->admin)->postJson('/api/v1/fee-vouchers/generate', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'fee_plan_id' => $this->plan->id,
            'apply_scholarships' => false,
        ])->assertStatus(201);

        $this->assertSame(2000.0, $this->voucherDiscount($this->studentOne));
        $this->assertSame(2000.0, $this->voucherDiscount($this->studentTwo));
    }

    public function test_explicit_discounts_override_concessions(): void
    {
        $this->policy(['code' => 'FLAT1500', 'discount_type' => DiscountType::Fixed, 'value' => 1500]);

        $this->as($this->admin)->postJson('/api/v1/fee-vouchers/generate', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'fee_plan_id' => $this->plan->id,
            'apply_scholarships' => false,
            'discounts' => [$this->studentOne->id => 100],
        ])->assertStatus(201);

        $this->assertSame(100.0, $this->voucherDiscount($this->studentOne));
        $this->assertSame(1500.0, $this->voucherDiscount($this->studentTwo));
    }

    public function test_teacher_cannot_manage_concessions(): void
    {
        $teacher = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $teacher->syncRoles([RoleName::Teacher->value]);

        $this->as($teacher)->postJson('/api/v1/concession-policies', [
            'name' => 'X', 'code' => 'X',
            'discount_type' => DiscountType::Fixed->value, 'value' => 1,
        ])->assertStatus(403);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function policy(array $attributes = []): ConcessionPolicy
    {
        return ConcessionPolicy::create(array_merge([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'academic_year_id' => $this->year->id,
            'name' => 'Policy',
            'code' => 'P'.ConcessionPolicy::query()->count(),
            'type' => ConcessionType::Other,
            'discount_type' => DiscountType::Percentage,
            'value' => 10,
            'is_active' => true,
        ], $attributes));
    }

    private function shareGuardian(Student $first, Student $second): void
    {
        $guardian = Guardian::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Shared Parent',
            'phone' => '0300-0000000',
        ]);

        $first->guardians()->attach($guardian->id, ['relationship' => 'father', 'is_primary' => true]);
        $second->guardians()->attach($guardian->id, ['relationship' => 'father', 'is_primary' => true]);
    }

    private function student(string $admissionNo, string $first, Gender $gender): Student
    {
        $student = Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'admission_no' => $admissionNo,
            'first_name' => $first, 'last_name' => 'Test',
            'gender' => $gender->value, 'status' => 'active',
        ]);

        StudentEnrollment::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $student->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'section_id' => $this->section->id,
            'status' => 'active',
        ]);

        return $student;
    }

    private function feePlan(): FeePlan
    {
        $tuition = FeeHead::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'code' => 'TUI', 'name' => 'Tuition',
            'income_account_id' => $this->accounts->get('4010')->id,
        ]);

        $response = $this->as($this->admin)->postJson('/api/v1/fee-plans', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'name' => 'Standard Fee',
            'items' => [['fee_head_id' => $tuition->id, 'amount' => 20000]],
            'installments' => [
                ['label' => 'Only', 'due_date' => '2026-07-10', 'percentage' => 100],
            ],
        ])->assertStatus(201);

        return FeePlan::query()->findOrFail($response->json('data.id'));
    }

    private function voucherDiscount(Student $student): float
    {
        $voucher = FeeVoucher::query()
            ->where('student_id', $student->id)
            ->where('fee_plan_id', $this->plan->id)
            ->orderBy('sequence')
            ->firstOrFail();

        return (float) $voucher->lines()->sum('discount_amount');
    }

    private function as(User $user): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('t')->plainTextToken);
    }
}
