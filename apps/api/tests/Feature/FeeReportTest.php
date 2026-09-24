<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ChartOfAccount;
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
use Illuminate\Support\Collection;
use Tests\TestCase;

class FeeReportTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private User $teacher;

    private AcademicYear $year;

    private ClassRoom $class;

    private Section $section;

    /** @var Collection<string, ChartOfAccount> */
    private Collection $accounts;

    private Student $ali;

    private Student $sara;

    private FeePlan $plan;

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

        $this->ali = $this->student('ADM-1', 'Ali', 'Raza');
        $this->sara = $this->student('ADM-2', 'Sara', 'Khan');

        $this->enroll($this->ali);
        $this->enroll($this->sara);

        $this->plan = $this->plan();
        $this->generate();
    }

    public function test_defaulters_report_ages_overdue_vouchers(): void
    {
        $response = $this->as($this->admin)
            ->getJson('/api/v1/fee-reports/defaulters?as_of=2026-08-15')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.outstanding', '12000.00')
            ->assertJsonPath('data.0.bucket', 'days_31_60')
            ->assertJsonPath('summary.students', 2)
            ->assertJsonPath('summary.outstanding', '24000.00');

        $this->assertSame('24000.00', $response->json('summary.buckets.days_31_60'));
    }

    public function test_defaulters_can_include_vouchers_not_yet_due(): void
    {
        $this->as($this->admin)
            ->getJson('/api/v1/fee-reports/defaulters?as_of=2026-08-15&overdue_only=0')
            ->assertOk()
            ->assertJsonPath('summary.students', 2)
            ->assertJsonPath('summary.vouchers', 6)
            ->assertJsonPath('summary.outstanding', '60000.00');
    }

    public function test_student_statement_lists_movements_and_balance(): void
    {
        $voucher = FeeVoucher::query()
            ->where('student_id', $this->ali->id)
            ->where('sequence', 1)
            ->firstOrFail();

        $this->as($this->admin)->postJson('/api/v1/fee-payments', [
            'student_id' => $this->ali->id,
            'fee_voucher_id' => $voucher->id,
            'payment_date' => '2026-07-15',
            'amount' => 5000,
            'method' => 'cash',
        ])->assertStatus(201);

        $this->as($this->admin)
            ->getJson("/api/v1/fee-reports/students/{$this->ali->id}/statement?to=2026-07-31")
            ->assertOk()
            ->assertJsonPath('opening_balance', '0.00')
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.type', 'voucher')
            ->assertJsonPath('data.0.debit', '12000.00')
            ->assertJsonPath('data.1.type', 'payment')
            ->assertJsonPath('data.1.credit', '5000.00')
            ->assertJsonPath('data.1.balance', '7000.00')
            ->assertJsonPath('totals.billed', '12000.00')
            ->assertJsonPath('totals.paid', '5000.00')
            ->assertJsonPath('totals.outstanding', '7000.00');
    }

    public function test_student_statement_rolls_earlier_movements_into_opening_balance(): void
    {
        $this->as($this->admin)
            ->getJson("/api/v1/fee-reports/students/{$this->sara->id}/statement?from=2026-10-01")
            ->assertOk()
            ->assertJsonPath('opening_balance', '12000.00')
            ->assertJsonPath('totals.outstanding', '30000.00');
    }

    public function test_class_summary_reports_billing_and_collection(): void
    {
        $voucher = FeeVoucher::query()
            ->where('student_id', $this->ali->id)
            ->where('sequence', 1)
            ->firstOrFail();

        $this->as($this->admin)->postJson('/api/v1/fee-payments', [
            'student_id' => $this->ali->id,
            'fee_voucher_id' => $voucher->id,
            'payment_date' => '2026-07-15',
            'amount' => 5000,
            'method' => 'cash',
        ])->assertStatus(201);

        $this->as($this->admin)
            ->getJson("/api/v1/fee-reports/classes/summary?academic_year_id={$this->year->id}")
            ->assertOk()
            ->assertJsonPath('summary.classes', 1)
            ->assertJsonPath('summary.students', 2)
            ->assertJsonPath('summary.billed', '60000.00')
            ->assertJsonPath('summary.collected', '5000.00')
            ->assertJsonPath('summary.outstanding', '55000.00')
            ->assertJsonPath('data.0.class', 'Class 1')
            ->assertJsonPath('data.0.vouchers', 6);
    }

    public function test_collection_report_breaks_down_by_method_and_day(): void
    {
        $voucher = FeeVoucher::query()
            ->where('student_id', $this->ali->id)
            ->where('sequence', 1)
            ->firstOrFail();

        $this->as($this->admin)->postJson('/api/v1/fee-payments', [
            'student_id' => $this->ali->id,
            'fee_voucher_id' => $voucher->id,
            'payment_date' => '2026-07-15',
            'amount' => 5000,
            'method' => 'cash',
        ])->assertStatus(201);

        $this->as($this->admin)
            ->getJson('/api/v1/fee-reports/collection?from=2026-07-01&to=2026-07-31')
            ->assertOk()
            ->assertJsonPath('total', '5000.00')
            ->assertJsonPath('count', 1)
            ->assertJsonPath('by_method.0.method', 'cash')
            ->assertJsonPath('by_method.0.total', '5000.00')
            ->assertJsonPath('by_day.0.date', '2026-07-15')
            ->assertJsonPath('by_day.0.total', '5000.00');
    }

    public function test_teacher_cannot_view_fee_reports(): void
    {
        $this->as($this->teacher)
            ->getJson('/api/v1/fee-reports/defaulters')
            ->assertStatus(403);

        $this->as($this->teacher)
            ->getJson('/api/v1/fee-reports/collection')
            ->assertStatus(403);
    }

    private function plan(): FeePlan
    {
        $tuition = FeeHead::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'code' => 'TUI',
            'name' => 'Tuition Fee',
            'income_account_id' => $this->accounts->get('4010')->id,
        ]);

        $transport = FeeHead::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'code' => 'TRA',
            'name' => 'Transport Fee',
            'income_account_id' => $this->accounts->get('4030')->id,
        ]);

        $response = $this->as($this->admin)->postJson('/api/v1/fee-plans', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'name' => 'Standard Fee',
            'items' => [
                ['fee_head_id' => $tuition->id, 'amount' => 30000],
                ['fee_head_id' => $transport->id, 'amount' => 4000, 'is_optional' => true],
            ],
            'installments' => [
                ['label' => 'First', 'due_date' => '2026-07-10', 'percentage' => 40],
                ['label' => 'Second', 'due_date' => '2026-10-10', 'percentage' => 30],
                ['label' => 'Third', 'due_date' => '2027-01-10', 'percentage' => 30],
            ],
        ])->assertStatus(201);

        return FeePlan::query()->findOrFail($response->json('data.id'));
    }

    private function generate(): void
    {
        $this->as($this->admin)->postJson('/api/v1/fee-vouchers/generate', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'fee_plan_id' => $this->plan->id,
        ])->assertStatus(201);
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

    private function student(string $admissionNo, string $first, string $last): Student
    {
        return Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'admission_no' => $admissionNo,
            'first_name' => $first,
            'last_name' => $last,
            'gender' => 'male',
        ]);
    }

    private function enroll(Student $student): void
    {
        StudentEnrollment::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $student->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'section_id' => $this->section->id,
            'status' => 'active',
        ]);
    }
}
