<?php

namespace Tests\Feature;

use App\Enums\RoleName;
use App\Enums\VoucherStatus;
use App\Models\FeeCharge;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsFeeTenant;
use Tests\TestCase;

class FeeStudentReportTest extends TestCase
{
    use BuildsFeeTenant;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->setUpFeeTenant();
    }

    public function test_student_report_sums_billed_received_and_receivable(): void
    {
        $admin = $this->actor(RoleName::CampusAdmin);

        $aliCharge = $this->generateCharge($this->ali, 12000)['charges'][0]['id'];
        $this->receive($admin, $this->ali, $aliCharge, 5000);

        $saraCharge = $this->generateCharge($this->sara, 8000)['charges'][0]['id'];
        $this->receive($admin, $this->sara, $saraCharge, 8000);

        $this->as($admin)
            ->getJson('/api/v1/fee-reports/students?as_of=2026-08-15')
            ->assertOk()
            ->assertJsonPath('summary.students', 2)
            ->assertJsonPath('summary.charges', 2)
            ->assertJsonPath('summary.billed', '20000.00')
            ->assertJsonPath('summary.received', '13000.00')
            ->assertJsonPath('summary.receivable', '7000.00')
            ->assertJsonPath('summary.overdue', '7000.00')
            ->assertJsonPath('data.0.student_name', 'Ali Raza')
            ->assertJsonPath('data.0.receivable', '7000.00')
            ->assertJsonPath('data.0.overdue', '7000.00')
            ->assertJsonPath('data.0.status', 'outstanding')
            ->assertJsonPath('data.1.student_name', 'Sara Khan')
            ->assertJsonPath('data.1.receivable', '0.00')
            ->assertJsonPath('data.1.status', 'cleared');
    }

    public function test_student_report_filters_by_class_section_student_and_search(): void
    {
        $admin = $this->actor(RoleName::CampusAdmin);

        $this->generateCharge($this->ali, 12000);
        $this->generateCharge($this->sara, 8000);

        $this->as($admin)
            ->getJson('/api/v1/fee-reports/students?search=Sara')
            ->assertOk()
            ->assertJsonPath('summary.students', 1)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.admission_no', 'ADM-2');

        $this->as($admin)
            ->getJson('/api/v1/fee-reports/students?class_room_id='.$this->classRoom->id.'&section_id='.$this->section->id)
            ->assertOk()
            ->assertJsonPath('summary.students', 2);

        $this->as($admin)
            ->getJson('/api/v1/fee-reports/students?student_id='.$this->ali->id)
            ->assertOk()
            ->assertJsonPath('summary.students', 1)
            ->assertJsonPath('data.0.student_name', 'Ali Raza');
    }

    public function test_student_report_status_filters_and_as_of_overdue(): void
    {
        $admin = $this->actor(RoleName::CampusAdmin);

        $aliCharge = $this->generateCharge($this->ali, 12000)['charges'][0]['id'];
        $this->receive($admin, $this->ali, $aliCharge, 12000);
        $this->generateCharge($this->sara, 8000);

        $this->as($admin)
            ->getJson('/api/v1/fee-reports/students?status=outstanding')
            ->assertOk()
            ->assertJsonPath('summary.students', 1)
            ->assertJsonPath('data.0.admission_no', 'ADM-2');

        $this->as($admin)
            ->getJson('/api/v1/fee-reports/students?status=cleared')
            ->assertOk()
            ->assertJsonPath('summary.students', 1)
            ->assertJsonPath('data.0.admission_no', 'ADM-1');

        $this->as($admin)
            ->getJson('/api/v1/fee-reports/students?status=overdue&as_of=2026-07-01')
            ->assertOk()
            ->assertJsonPath('summary.students', 0);

        $this->as($admin)
            ->getJson('/api/v1/fee-reports/students?status=overdue&as_of=2026-08-15')
            ->assertOk()
            ->assertJsonPath('summary.students', 1)
            ->assertJsonPath('data.0.admission_no', 'ADM-2');
    }

    public function test_void_charges_are_excluded_from_student_report(): void
    {
        $admin = $this->actor(RoleName::CampusAdmin);

        $aliCharge = $this->generateCharge($this->ali, 12000)['charges'][0]['id'];
        FeeCharge::query()->whereKey($aliCharge)->update(['status' => VoucherStatus::Void->value]);

        $this->generateCharge($this->sara, 8000);

        $this->as($admin)
            ->getJson('/api/v1/fee-reports/students')
            ->assertOk()
            ->assertJsonPath('summary.students', 1)
            ->assertJsonPath('summary.billed', '8000.00')
            ->assertJsonPath('data.0.admission_no', 'ADM-2');
    }

    public function test_summary_covers_all_filtered_students_not_just_current_page(): void
    {
        $admin = $this->actor(RoleName::CampusAdmin);

        $this->generateCharge($this->ali, 12000);
        $this->generateCharge($this->sara, 8000);

        $this->as($admin)
            ->getJson('/api/v1/fee-reports/students?per_page=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('summary.students', 2)
            ->assertJsonPath('summary.billed', '20000.00')
            ->assertJsonPath('meta.total', 2);
    }

    public function test_teacher_without_fee_permission_is_denied(): void
    {
        $teacher = $this->actor(RoleName::Teacher);

        $this->as($teacher)
            ->getJson('/api/v1/fee-reports/students')
            ->assertStatus(403);
    }

    public function test_finance_view_grants_student_report_access(): void
    {
        $user = $this->userWithPermissions(['finance.view']);

        $this->generateCharge($this->ali, 12000);

        $this->as($user)
            ->getJson('/api/v1/fee-reports/students')
            ->assertOk()
            ->assertJsonPath('summary.students', 1);
    }

    private function receive($admin, $student, int $chargeId, float $amount): void
    {
        $this->as($admin)
            ->postJson('/api/v1/fee-receipts', [
                'student_id' => $student->id,
                'fee_charge_id' => $chargeId,
                'academic_year_id' => $this->year->id,
                'payment_date' => '2026-07-15',
                'amount' => $amount,
                'method' => 'cash',
            ])
            ->assertStatus(201);
    }
}
