<?php

namespace Tests\Feature;

use App\Enums\AttendanceStatus;
use App\Enums\CampusType;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\RoleName;
use App\Enums\ScholarshipAwardStatus;
use App\Enums\ScholarshipDiscountType;
use App\Enums\ScholarshipType;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ClassRoom;
use App\Models\FeePayment;
use App\Models\FeePlan;
use App\Models\FeeVoucher;
use App\Models\Institution;
use App\Models\Scholarship;
use App\Models\ScholarshipAward;
use App\Models\Section;
use App\Models\Stage;
use App\Models\Student;
use App\Models\StudentAttendance;
use App\Models\StudentEnrollment;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentHistoryTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private AcademicYear $year;

    private ClassRoom $class;

    private Section $section;

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

        $this->student = Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'admission_no' => 'ADM-1',
            'first_name' => 'Ali', 'last_name' => 'Raza',
            'gender' => 'male', 'status' => 'active',
        ]);

        StudentEnrollment::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $this->student->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'section_id' => $this->section->id,
            'roll_number' => '1',
            'status' => 'active',
            'starts_on' => '2026-04-01',
        ]);
    }

    public function test_history_rolls_up_academic_attendance_and_fee_data(): void
    {
        $this->markAttendance('2026-09-21', AttendanceStatus::Present);
        $this->markAttendance('2026-09-22', AttendanceStatus::Present);
        $this->markAttendance('2026-09-23', AttendanceStatus::Present);
        $this->markAttendance('2026-09-24', AttendanceStatus::Late);
        $this->markAttendance('2026-09-25', AttendanceStatus::Absent);

        $plan = FeePlan::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'name' => 'Standard Fee', 'is_active' => true,
        ]);

        FeeVoucher::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $this->student->id,
            'academic_year_id' => $this->year->id,
            'fee_plan_id' => $plan->id,
            'sequence' => 1,
            'voucher_no' => 'VCH-0001',
            'due_date' => '2026-07-10',
            'gross_amount' => 30000,
            'discount_amount' => 2000,
            'amount' => 28000,
            'paid_amount' => 10000,
            'status' => 'partial',
        ]);

        FeePayment::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $this->student->id,
            'receipt_no' => 'RV-0001',
            'payment_date' => '2026-07-15',
            'amount' => 10000,
            'method' => PaymentMethod::Cash,
            'status' => PaymentStatus::Posted,
        ]);

        $scholarship = Scholarship::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'name' => 'Merit Award', 'code' => 'MERIT',
            'type' => ScholarshipType::Merit,
            'discount_type' => ScholarshipDiscountType::Percentage,
            'value' => 10, 'is_active' => true,
        ]);

        ScholarshipAward::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'scholarship_id' => $scholarship->id,
            'student_id' => $this->student->id,
            'academic_year_id' => $this->year->id,
            'awarded_on' => '2026-09-01',
            'status' => ScholarshipAwardStatus::Active,
        ]);

        $this->as($this->admin)
            ->getJson("/api/v1/students/{$this->student->id}/history")
            ->assertOk()
            ->assertJsonPath('data.student.id', $this->student->id)
            ->assertJsonPath('data.academic_history.0.class_room', 'Class 1')
            ->assertJsonPath('data.academic_history.0.section', 'A')
            ->assertJsonPath('data.attendance.overall.total', 5)
            ->assertJsonPath('data.attendance.overall.present', 4)
            ->assertJsonPath('data.attendance.overall.late', 1)
            ->assertJsonPath('data.attendance.overall.absent', 1)
            ->assertJsonPath('data.attendance.overall.present_percentage', 80)
            ->assertJsonPath('data.fees.totals.gross', 30000)
            ->assertJsonPath('data.fees.totals.discount', 2000)
            ->assertJsonPath('data.fees.totals.payable', 28000)
            ->assertJsonPath('data.fees.totals.paid', 10000)
            ->assertJsonPath('data.fees.totals.balance', 18000)
            ->assertJsonPath('data.fees.recent_payments.0.receipt_no', 'RV-0001')
            ->assertJsonPath('data.fees.scholarships.0.scholarship', 'Merit Award')
            ->assertJsonPath('data.fees.scholarships.0.status', 'active');
    }

    public function test_history_requires_the_student_view_permission(): void
    {
        $this->getJson("/api/v1/students/{$this->student->id}/history")->assertStatus(401);
    }

    private function markAttendance(string $date, AttendanceStatus $status): void
    {
        StudentAttendance::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $this->student->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->class->id,
            'section_id' => $this->section->id,
            'attendance_date' => $date,
            'status' => $status,
            'marked_by' => $this->admin->id,
        ]);
    }

    private function as(User $user): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('t')->plainTextToken);
    }
}
