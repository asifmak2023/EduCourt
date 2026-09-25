<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Enums\ScholarshipAwardStatus;
use App\Enums\ScholarshipDiscountType;
use App\Enums\ScholarshipType;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ChartOfAccount;
use App\Models\ClassRoom;
use App\Models\FeeHead;
use App\Models\FeePlan;
use App\Models\FeeVoucher;
use App\Models\FiscalYear;
use App\Models\Institution;
use App\Models\Scholarship;
use App\Models\ScholarshipAward;
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

class ScholarshipTest extends TestCase
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

        $this->ali = $this->student('ADM-1', 'Ali', 'Raza');
        $this->sara = $this->student('ADM-2', 'Sara', 'Khan');

        $this->enroll($this->ali);
        $this->enroll($this->sara);
    }

    public function test_scholarship_can_be_created_listed_and_updated(): void
    {
        $created = $this->as($this->admin)->postJson('/api/v1/scholarships', [
            'name' => 'Merit Award',
            'code' => 'MERIT',
            'type' => ScholarshipType::Merit->value,
            'discount_type' => ScholarshipDiscountType::Percentage->value,
            'value' => 15,
            'academic_year_id' => $this->year->id,
            'sponsor' => 'Endowment Fund',
            'is_active' => true,
        ])->assertStatus(201)
            ->assertJsonPath('data.code', 'MERIT')
            ->assertJsonPath('data.type', 'merit');

        $id = $created->json('data.id');

        $this->as($this->admin)->getJson('/api/v1/scholarships?search=Merit')
            ->assertOk()
            ->assertJsonPath('data.0.id', $id);

        $this->as($this->admin)->putJson("/api/v1/scholarships/{$id}", [
            'value' => 20,
        ])->assertOk()->assertJsonPath('data.value', '20.00');

        $this->as($this->admin)->deleteJson("/api/v1/scholarships/{$id}")->assertOk();
        $this->assertSoftDeleted('scholarships', ['id' => $id]);
    }

    public function test_duplicate_scholarship_code_is_rejected(): void
    {
        $payload = [
            'name' => 'Need Grant',
            'code' => 'NEED',
            'discount_type' => ScholarshipDiscountType::Fixed->value,
            'value' => 5000,
        ];

        $this->as($this->admin)->postJson('/api/v1/scholarships', $payload)->assertStatus(201);
        $this->as($this->admin)->postJson('/api/v1/scholarships', $payload)
            ->assertStatus(422)->assertJsonValidationErrors('code');
    }

    public function test_duplicate_award_for_a_student_is_rejected(): void
    {
        $scholarship = $this->scholarship();

        $payload = [
            'scholarship_id' => $scholarship->id,
            'student_id' => $this->ali->id,
            'academic_year_id' => $this->year->id,
            'awarded_on' => '2026-09-01',
        ];

        $this->as($this->admin)->postJson('/api/v1/scholarship-awards', $payload)
            ->assertStatus(201)
            ->assertJsonPath('data.status', ScholarshipAwardStatus::Active->value);

        $this->as($this->admin)->postJson('/api/v1/scholarship-awards', $payload)
            ->assertStatus(422)->assertJsonValidationErrors('student_id');
    }

    public function test_award_can_be_revoked_once(): void
    {
        $scholarship = $this->scholarship();

        $awardId = $this->as($this->admin)->postJson('/api/v1/scholarship-awards', [
            'scholarship_id' => $scholarship->id,
            'student_id' => $this->ali->id,
            'academic_year_id' => $this->year->id,
        ])->assertStatus(201)->json('data.id');

        $this->as($this->admin)->postJson("/api/v1/scholarship-awards/{$awardId}/revoke")
            ->assertOk()
            ->assertJsonPath('data.status', ScholarshipAwardStatus::Revoked->value);

        $award = ScholarshipAward::query()->findOrFail($awardId);
        $this->assertSame(ScholarshipAwardStatus::Revoked, $award->status);
        $this->assertNotNull($award->revoked_on);

        $this->as($this->admin)->postJson("/api/v1/scholarship-awards/{$awardId}/revoke")
            ->assertStatus(422)->assertJsonValidationErrors('status');
    }

    public function test_scholarship_discount_is_applied_during_voucher_generation(): void
    {
        $plan = $this->plan();

        $scholarship = $this->scholarship(ScholarshipDiscountType::Percentage, 10);

        $this->as($this->admin)->postJson('/api/v1/scholarship-awards', [
            'scholarship_id' => $scholarship->id,
            'student_id' => $this->ali->id,
            'academic_year_id' => $this->year->id,
        ])->assertStatus(201);

        $this->as($this->admin)->postJson('/api/v1/fee-vouchers/generate', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'fee_plan_id' => $plan->id,
        ])->assertStatus(201);

        $aliTotal = (float) FeeVoucher::query()->where('student_id', $this->ali->id)->sum('amount');
        $saraTotal = (float) FeeVoucher::query()->where('student_id', $this->sara->id)->sum('amount');

        $this->assertSame(27000.0, $aliTotal);
        $this->assertSame(30000.0, $saraTotal);

        $first = FeeVoucher::query()
            ->where('student_id', $this->ali->id)
            ->where('sequence', 1)
            ->firstOrFail();

        $this->assertSame('1200.00', (string) $first->discount_amount);
        $this->assertSame('10800.00', (string) $first->amount);
    }

    public function test_explicit_discount_overrides_scholarship(): void
    {
        $plan = $this->plan();

        $scholarship = $this->scholarship(ScholarshipDiscountType::Percentage, 10);

        $this->as($this->admin)->postJson('/api/v1/scholarship-awards', [
            'scholarship_id' => $scholarship->id,
            'student_id' => $this->ali->id,
            'academic_year_id' => $this->year->id,
        ])->assertStatus(201);

        $this->as($this->admin)->postJson('/api/v1/fee-vouchers/generate', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'fee_plan_id' => $plan->id,
            'discounts' => [$this->ali->id => 6000],
        ])->assertStatus(201);

        $this->assertSame(24000.0, (float) FeeVoucher::query()->where('student_id', $this->ali->id)->sum('amount'));
    }

    public function test_teacher_cannot_manage_scholarships(): void
    {
        $this->as($this->teacher)->getJson('/api/v1/scholarships')->assertStatus(403);
        $this->as($this->teacher)->postJson('/api/v1/scholarships', [
            'name' => 'Nope', 'code' => 'NOPE',
            'discount_type' => 'fixed', 'value' => 100,
        ])->assertStatus(403);
    }

    private function scholarship(
        ScholarshipDiscountType $discountType = ScholarshipDiscountType::Percentage,
        float $value = 10,
    ): Scholarship {
        return Scholarship::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Grant',
            'code' => 'GRANT-'.random_int(1000, 9999),
            'type' => ScholarshipType::Merit,
            'discount_type' => $discountType,
            'value' => $value,
            'academic_year_id' => $this->year->id,
            'is_active' => true,
        ]);
    }

    private function plan(): FeePlan
    {
        $tuition = FeeHead::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'code' => 'TUI',
            'name' => 'Tuition',
            'income_account_id' => $this->accounts->get('4010')->id,
        ]);

        $response = $this->as($this->admin)->postJson('/api/v1/fee-plans', [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'name' => 'Standard Fee',
            'items' => [
                ['fee_head_id' => $tuition->id, 'amount' => 30000],
            ],
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
            'status' => 'active',
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
