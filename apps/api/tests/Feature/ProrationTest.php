<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ClassRoom;
use App\Models\FeeHead;
use App\Models\FeePlan;
use App\Models\FeeVoucher;
use App\Models\FiscalYear;
use App\Models\Institution;
use App\Models\Section;
use App\Models\Stage;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\User;
use App\Services\Accounting\DefaultChartOfAccounts;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProrationTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private AcademicYear $year;

    private ClassRoom $class;

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

        $this->admin = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $this->admin->syncRoles([RoleName::CampusAdmin->value]);

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

        $section = Section::create([
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

        app(DefaultChartOfAccounts::class)->seed($this->campus);

        $this->student = Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'admission_no' => 'ADM-1', 'first_name' => 'Ali', 'last_name' => 'Raza',
            'gender' => 'male',
        ]);

        StudentEnrollment::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $this->student->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'section_id' => $section->id,
            'status' => 'active',
        ]);
    }

    public function test_mid_year_join_prorates_the_active_installment_and_skips_past_ones(): void
    {
        $plan = $this->plan();

        $this->as($this->admin)->postJson('/api/v1/fee-vouchers/generate-prorated', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'fee_plan_id' => $plan->id,
            'student_id' => $this->student->id,
            'join_date' => '2026-08-01',
        ])->assertStatus(201)
            ->assertJsonPath('created', 2)
            ->assertJsonPath('skipped', 1);

        $vouchers = FeeVoucher::query()->where('student_id', $this->student->id)
            ->orderBy('sequence')->get();

        $this->assertCount(2, $vouchers);
        $this->assertSame([2, 3], $vouchers->pluck('sequence')->all());
        $this->assertSame('6945.30', (string) $vouchers[0]->gross_amount);
        $this->assertSame('9000.00', (string) $vouchers[1]->gross_amount);
    }

    public function test_joining_before_the_first_period_bills_full_installments(): void
    {
        $plan = $this->plan();

        $this->as($this->admin)->postJson('/api/v1/fee-vouchers/generate-prorated', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'fee_plan_id' => $plan->id,
            'student_id' => $this->student->id,
            'join_date' => '2026-04-05',
        ])->assertStatus(201)
            ->assertJsonPath('created', 3)
            ->assertJsonPath('skipped', 0);
    }

    public function test_joining_after_every_due_date_bills_nothing(): void
    {
        $plan = $this->plan();

        $this->as($this->admin)->postJson('/api/v1/fee-vouchers/generate-prorated', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'fee_plan_id' => $plan->id,
            'student_id' => $this->student->id,
            'join_date' => '2027-02-01',
        ])->assertStatus(201)
            ->assertJsonPath('created', 0);

        $this->assertSame(0, FeeVoucher::query()->where('student_id', $this->student->id)->count());
    }

    private function plan(): FeePlan
    {
        $tuition = FeeHead::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Tuition Fee', 'code' => 'TUI',
            'income_account_id' => app(DefaultChartOfAccounts::class)->seed($this->campus)['4010']->id,
        ]);

        $response = $this->as($this->admin)->postJson('/api/v1/fee-plans', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'name' => 'Standard Fee',
            'late_fee_type' => 'none',
            'late_fee_amount' => 0,
            'items' => [['fee_head_id' => $tuition->id, 'amount' => 30000]],
            'installments' => [
                ['label' => 'First', 'due_date' => '2026-07-10', 'percentage' => 40],
                ['label' => 'Second', 'due_date' => '2026-10-10', 'percentage' => 30],
                ['label' => 'Third', 'due_date' => '2027-01-10', 'percentage' => 30],
            ],
        ])->assertStatus(201);

        return FeePlan::query()->findOrFail($response->json('data.id'));
    }

    private function as(User $user): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('t')->plainTextToken);
    }
}
