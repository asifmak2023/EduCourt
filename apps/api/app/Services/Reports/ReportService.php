<?php

namespace App\Services\Reports;

use App\Enums\AccountType;
use App\Enums\AdmissionStatus;
use App\Enums\ConductStatus;
use App\Enums\ExamStatus;
use App\Enums\JournalStatus;
use App\Enums\LeaveStatus;
use App\Enums\PaymentStatus;
use App\Enums\PayrollRunStatus;
use App\Enums\StaffStatus;
use App\Enums\StudentStatus;
use App\Enums\VoucherStatus;
use App\Models\AcademicEvent;
use App\Models\Admission;
use App\Models\Campus;
use App\Models\ClassRoom;
use App\Models\ConductRecord;
use App\Models\Department;
use App\Models\Exam;
use App\Models\ExamMark;
use App\Models\ExamPaper;
use App\Models\FeePayment;
use App\Models\FeeVoucher;
use App\Models\Institution;
use App\Models\JournalLine;
use App\Models\LeaveRequest;
use App\Models\PayrollRun;
use App\Models\ScholarshipAward;
use App\Models\StaffAttendance;
use App\Models\StaffMember;
use App\Models\Student;
use App\Models\StudentAttendance;
use App\Models\StudentEnrollment;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Read-only aggregation used by the reporting and analytics module. Queries
 * rely on the campus/institution global scopes for tenant isolation and only
 * add explicit date and dimension filters on top.
 */
class ReportService
{
    /**
     * Snapshot of the active campus for the landing dashboard.
     *
     * @return array<string, mixed>
     */
    public function campusDashboard(): array
    {
        $today = CarbonImmutable::today();

        $students = Student::query()->where('status', StudentStatus::Active->value);
        $staff = StaffMember::query()->whereIn('status', $this->employedStatuses());
        $admissions = Admission::query();

        $unpaid = FeeVoucher::query()
            ->whereNotIn('status', [VoucherStatus::Void->value])
            ->whereColumn('paid_amount', '<', 'amount');

        $collectedThisMonth = FeePayment::query()
            ->where('status', PaymentStatus::Posted->value)
            ->whereBetween('payment_date', [$today->startOfMonth()->toDateString(), $today->endOfMonth()->toDateString()])
            ->sum('amount');

        return [
            'as_on' => $today->toDateString(),
            'students_active' => (int) $students->count(),
            'students_by_gender' => (clone $students)
                ->select('gender', DB::raw('count(*) as total'))
                ->groupBy('gender')
                ->pluck('total', 'gender')
                ->map(fn ($count, $gender) => ['gender' => $gender, 'total' => (int) $count])
                ->values(),
            'staff_employed' => (int) $staff->count(),
            'enrollments_active' => (int) StudentEnrollment::query()->where('status', 'active')->count(),
            'admissions_pending' => (int) $admissions
                ->whereIn('status', [
                    AdmissionStatus::Enquiry->value,
                    AdmissionStatus::Applied->value,
                    AdmissionStatus::UnderReview->value,
                ])->count(),
            'unpaid_vouchers' => (int) (clone $unpaid)->count(),
            'outstanding_fees' => round((float) (clone $unpaid)->sum('amount') - (float) (clone $unpaid)->sum('paid_amount'), 2),
            'fees_collected_this_month' => round((float) $collectedThisMonth, 2),
            'scholarships_active' => (int) ScholarshipAward::query()
                ->where('status', 'active')
                ->count(),
            'exams_scheduled' => (int) Exam::query()
                ->whereIn('status', [ExamStatus::Scheduled->value, ExamStatus::Ongoing->value])
                ->count(),
            'leave_pending' => (int) LeaveRequest::query()->where('status', LeaveStatus::Pending->value)->count(),
            'conduct_open' => (int) ConductRecord::query()->where('status', ConductStatus::Open->value)->count(),
            'payroll_draft_runs' => (int) PayrollRun::query()->where('status', PayrollRunStatus::Draft->value)->count(),
            'upcoming_events' => (int) AcademicEvent::query()->whereDate('starts_on', '>=', $today->toDateString())->count(),
        ];
    }

    /**
     * Student progress/status report: population, admissions funnel,
     * enrollment movement and scholarships for a date range.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function progressReport(array $filters): array
    {
        $students = Student::query();

        $admissions = Admission::query()
            ->when($filters['from'] ?? null, fn (Builder $q, $from) => $q->whereDate('applied_on', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $q, $to) => $q->whereDate('applied_on', '<=', $to))
            ->when($filters['academic_year_id'] ?? null, fn (Builder $q, $year) => $q->where('academic_year_id', $year));

        $enrollments = StudentEnrollment::query()
            ->when($filters['academic_year_id'] ?? null, fn (Builder $q, $year) => $q->where('academic_year_id', $year));

        $awards = ScholarshipAward::query()
            ->with('scholarship')
            ->where('status', 'active')
            ->when($filters['academic_year_id'] ?? null, fn (Builder $q, $year) => $q->where('academic_year_id', $year))
            ->get();

        $events = AcademicEvent::query()
            ->when($filters['from'] ?? null, fn (Builder $q, $from) => $q->whereDate('starts_on', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $q, $to) => $q->whereDate('ends_on', '<=', $to));

        $scholarshipValue = $awards->sum(fn (ScholarshipAward $award) => (float) ($award->value_override ?? $award->scholarship?->value ?? 0));

        return [
            'filters' => [
                'from' => $filters['from'] ?? null,
                'to' => $filters['to'] ?? null,
                'academic_year_id' => $filters['academic_year_id'] ?? null,
            ],
            'students' => [
                'total' => (int) (clone $students)->count(),
                'active' => (int) (clone $students)->where('status', StudentStatus::Active->value)->count(),
                'by_status' => (clone $students)
                    ->select('status', DB::raw('count(*) as total'))
                    ->groupBy('status')
                    ->pluck('total', 'status')
                    ->map(fn ($count, $status) => ['status' => $status, 'total' => (int) $count])
                    ->values(),
                'by_gender' => (clone $students)
                    ->select('gender', DB::raw('count(*) as total'))
                    ->groupBy('gender')
                    ->pluck('total', 'gender')
                    ->map(fn ($count, $gender) => ['gender' => $gender, 'total' => (int) $count])
                    ->values(),
            ],
            'admissions' => [
                'total' => (int) (clone $admissions)->count(),
                'by_status' => (clone $admissions)
                    ->select('status', DB::raw('count(*) as total'))
                    ->groupBy('status')
                    ->pluck('total', 'status')
                    ->map(fn ($count, $status) => [
                        'status' => $status instanceof AdmissionStatus ? $status->value : $status,
                        'total' => (int) $count,
                    ])->values(),
            ],
            'enrollments' => [
                'total' => (int) (clone $enrollments)->count(),
                'by_status' => (clone $enrollments)
                    ->select('status', DB::raw('count(*) as total'))
                    ->groupBy('status')
                    ->pluck('total', 'status')
                    ->map(fn ($count, $status) => ['status' => $status, 'total' => (int) $count])
                    ->values(),
            ],
            'scholarships' => [
                'active_awards' => $awards->count(),
                'total_value' => round((float) $scholarshipValue, 2),
                'by_type' => $awards
                    ->groupBy(fn (ScholarshipAward $award) => $award->scholarship?->type?->value ?? 'unknown')
                    ->map(fn ($group, $type) => [
                        'type' => $type,
                        'awards' => $group->count(),
                        'value' => round((float) $group->sum(fn (ScholarshipAward $a) => (float) ($a->value_override ?? $a->scholarship?->value ?? 0)), 2),
                    ])->values(),
            ],
            'events' => [
                'total' => (int) (clone $events)->count(),
            ],
        ];
    }

    /**
     * Attendance rates for a class or the whole campus over a period.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function attendanceSummary(array $filters): array
    {
        $query = StudentAttendance::query()
            ->when($filters['class_room_id'] ?? null, fn (Builder $q, $class) => $q->where('class_room_id', $class))
            ->when($filters['academic_year_id'] ?? null, fn (Builder $q, $year) => $q->where('academic_year_id', $year))
            ->when($filters['from'] ?? null, fn (Builder $q, $from) => $q->whereDate('attendance_date', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $q, $to) => $q->whereDate('attendance_date', '<=', $to));

        $totals = (clone $query)
            ->selectRaw('count(*) as total')
            ->selectRaw("sum(case when status in ('present','late') then 1 else 0 end) as attended")
            ->selectRaw("sum(case when status = 'absent' then 1 else 0 end) as absent")
            ->selectRaw("sum(case when status = 'late' then 1 else 0 end) as late")
            ->selectRaw("sum(case when status = 'leave' then 1 else 0 end) as `leave`")
            ->selectRaw("sum(case when status = 'excused' then 1 else 0 end) as excused")
            ->first();

        $total = (int) ($totals->total ?? 0);
        $attended = (int) ($totals->attended ?? 0);

        $byClass = (clone $query)
            ->select('class_room_id', DB::raw('count(*) as total'))
            ->selectRaw("sum(case when status in ('present','late') then 1 else 0 end) as attended")
            ->selectRaw("sum(case when status = 'absent' then 1 else 0 end) as absent")
            ->groupBy('class_room_id')
            ->get()
            ->map(fn ($row) => [
                'class_room_id' => $row->class_room_id,
                'class_room' => optional(ClassRoom::find($row->class_room_id))->name,
                'total' => (int) $row->total,
                'attended' => (int) $row->attended,
                'absent' => (int) $row->absent,
                'attendance_percentage' => $this->percentage((int) $row->attended, (int) $row->total),
            ])->values();

        return [
            'filters' => [
                'class_room_id' => $filters['class_room_id'] ?? null,
                'academic_year_id' => $filters['academic_year_id'] ?? null,
                'from' => $filters['from'] ?? null,
                'to' => $filters['to'] ?? null,
            ],
            'totals' => [
                'total' => $total,
                'present' => $attended - (int) ($totals->late ?? 0),
                'late' => (int) ($totals->late ?? 0),
                'absent' => (int) ($totals->absent ?? 0),
                'leave' => (int) ($totals->leave ?? 0),
                'excused' => (int) ($totals->excused ?? 0),
                'attendance_percentage' => $this->percentage($attended, $total),
            ],
            'by_class' => $byClass,
        ];
    }

    /**
     * Pass/fail and grade distribution for an exam.
     *
     * @return array<string, mixed>
     */
    public function resultSummary(Exam $exam): array
    {
        $papers = ExamPaper::query()->where('exam_id', $exam->id)->get()->keyBy('id');

        $marks = ExamMark::query()
            ->where('exam_id', $exam->id)
            ->get()
            ->filter(fn (ExamMark $mark) => $papers->has($mark->exam_paper_id));

        $graded = $marks->where('is_absent', false)->whereNotNull('marks_obtained');
        $percentages = $graded->map(function (ExamMark $mark) use ($papers) {
            $max = (float) $papers->get($mark->exam_paper_id)->max_marks;

            return $max > 0 ? (float) $mark->marks_obtained / $max * 100 : 0.0;
        });

        $passing = $marks->filter(function (ExamMark $mark) use ($papers) {
            if ($mark->is_absent || $mark->marks_obtained === null) {
                return false;
            }

            return (float) $mark->marks_obtained >= (float) $papers->get($mark->exam_paper_id)->pass_marks;
        })->count();

        $byPaper = $marks->groupBy('exam_paper_id')->map(function ($group, $paperId) use ($papers) {
            $paper = $papers->get($paperId);
            $max = (float) $paper->max_marks;
            $obtained = (float) $group->where('is_absent', false)->sum('marks_obtained');
            $count = $group->where('is_absent', false)->whereNotNull('marks_obtained')->count();
            $passed = $group->filter(fn (ExamMark $m) => ! $m->is_absent && $m->marks_obtained !== null && (float) $m->marks_obtained >= (float) $paper->pass_marks)->count();

            return [
                'exam_paper_id' => (int) $paperId,
                'subject' => optional($paper->subject)->name,
                'class_room' => optional($paper->class_room_id ? ClassRoom::find($paper->class_room_id) : null)->name,
                'max_marks' => $max,
                'pass_marks' => (float) $paper->pass_marks,
                'entered' => $group->count(),
                'absent' => (int) $group->where('is_absent', true)->count(),
                'average' => $count > 0 ? round($obtained / $count, 2) : 0.0,
                'average_percentage' => $count > 0 && $max > 0 ? round($obtained / ($count * $max) * 100, 2) : 0.0,
                'passed' => $passed,
                'failed' => max(0, $count - $passed),
            ];
        })->values();

        return [
            'exam' => [
                'id' => $exam->id,
                'name' => $exam->name,
                'academic_year_id' => $exam->academic_year_id,
                'status' => $exam->status?->value ?? $exam->status,
            ],
            'totals' => [
                'papers' => $papers->count(),
                'marks_entered' => $marks->count(),
                'graded' => $graded->count(),
                'absent' => (int) $marks->where('is_absent', true)->count(),
                'passed' => $passing,
                'failed' => max(0, $graded->count() - $passing),
                'pass_percentage' => $this->percentage($passing, $graded->count()),
                'average_percentage' => $percentages->count() > 0 ? round((float) $percentages->avg(), 2) : 0.0,
                'highest_percentage' => $percentages->count() > 0 ? round((float) $percentages->max(), 2) : 0.0,
                'lowest_percentage' => $percentages->count() > 0 ? round((float) $percentages->min(), 2) : 0.0,
            ],
            'by_paper' => $byPaper,
        ];
    }

    /**
     * HR report: headcount, attendance and leave for a period.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function staffSummary(array $filters): array
    {
        $asOn = $filters['as_on'] ?? CarbonImmutable::today()->toDateString();

        $employed = StaffMember::query()
            ->whereIn('status', $this->employedStatuses())
            ->whereDate('joining_date', '<=', $asOn)
            ->where(fn (Builder $q) => $q->whereNull('leaving_date')->orWhereDate('leaving_date', '>=', $asOn));

        $attendance = StaffAttendance::query()
            ->when($filters['from'] ?? null, fn (Builder $q, $from) => $q->whereDate('attendance_date', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $q, $to) => $q->whereDate('attendance_date', '<=', $to));

        $leaves = LeaveRequest::query()
            ->when($filters['from'] ?? null, fn (Builder $q, $from) => $q->whereDate('from_date', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $q, $to) => $q->whereDate('to_date', '<=', $to));

        return [
            'filters' => [
                'as_on' => $asOn,
                'from' => $filters['from'] ?? null,
                'to' => $filters['to'] ?? null,
            ],
            'headcount' => [
                'total' => (int) (clone $employed)->count(),
                'by_department' => (clone $employed)
                    ->select('department_id', DB::raw('count(*) as total'))
                    ->groupBy('department_id')
                    ->pluck('total', 'department_id')
                    ->map(fn ($count, $id) => [
                        'department_id' => $id !== null ? (int) $id : null,
                        'department' => $id !== null ? optional(Department::find($id))->name : 'Unassigned',
                        'total' => (int) $count,
                    ])->values(),
                'by_employment_type' => (clone $employed)
                    ->select('employment_type', DB::raw('count(*) as total'))
                    ->groupBy('employment_type')
                    ->pluck('total', 'employment_type')
                    ->map(fn ($count, $type) => ['employment_type' => $type, 'total' => (int) $count])
                    ->values(),
            ],
            'attendance' => [
                'total' => (int) (clone $attendance)->count(),
                'by_status' => (clone $attendance)
                    ->select('status', DB::raw('count(*) as total'))
                    ->groupBy('status')
                    ->pluck('total', 'status')
                    ->map(fn ($count, $status) => ['status' => $status, 'total' => (int) $count])
                    ->values(),
            ],
            'leave' => [
                'total' => (int) (clone $leaves)->count(),
                'by_status' => (clone $leaves)
                    ->select('status', DB::raw('count(*) as total'))
                    ->groupBy('status')
                    ->pluck('total', 'status')
                    ->map(fn ($count, $status) => ['status' => $status, 'total' => (int) $count])
                    ->values(),
                'approved_days' => (int) (clone $leaves)->where('status', LeaveStatus::Approved->value)->sum('days'),
            ],
        ];
    }

    /**
     * Year-by-year consolidation for a single student, used for counselling.
     *
     * @return array<string, mixed>
     */
    public function studentYearlyAnalysis(Student $student): array
    {
        $enrollments = StudentEnrollment::query()
            ->with(['academicYear', 'classRoom', 'section'])
            ->where('student_id', $student->id)
            ->orderByDesc('academic_year_id')
            ->get();

        $attendance = StudentAttendance::query()
            ->where('student_id', $student->id)
            ->select('academic_year_id', DB::raw('count(*) as total'))
            ->selectRaw("sum(case when status in ('present','late') then 1 else 0 end) as attended")
            ->selectRaw("sum(case when status = 'absent' then 1 else 0 end) as absent")
            ->groupBy('academic_year_id')
            ->get()
            ->keyBy('academic_year_id');

        $conduct = ConductRecord::query()
            ->where('student_id', $student->id)
            ->select('academic_year_id', DB::raw('count(*) as total'))
            ->groupBy('academic_year_id')
            ->pluck('total', 'academic_year_id');

        $years = $enrollments->map(function (StudentEnrollment $enrollment) use ($student, $attendance, $conduct) {
            $yearId = $enrollment->academic_year_id;
            $attendanceRow = $attendance->get($yearId);
            $total = (int) ($attendanceRow->total ?? 0);
            $attended = (int) ($attendanceRow->attended ?? 0);

            $papers = ExamPaper::query()
                ->where('class_room_id', $enrollment->class_room_id)
                ->whereHas('exam', fn (Builder $q) => $q->where('academic_year_id', $yearId))
                ->get();

            $paperIds = $papers->pluck('id');
            $marks = ExamMark::query()
                ->where('student_id', $student->id)
                ->whereIn('exam_paper_id', $paperIds)
                ->get();

            $obtained = (float) $marks->where('is_absent', false)->sum('marks_obtained');
            $possible = (float) $papers->sum('max_marks');

            return [
                'academic_year_id' => $yearId,
                'academic_year' => $enrollment->academicYear?->name,
                'class_room' => $enrollment->classRoom?->name,
                'section' => $enrollment->section?->name,
                'status' => $enrollment->status?->value ?? $enrollment->status,
                'attendance' => [
                    'total' => $total,
                    'attended' => $attended,
                    'absent' => (int) ($attendanceRow->absent ?? 0),
                    'attendance_percentage' => $this->percentage($attended, $total),
                ],
                'academics' => [
                    'subjects' => $papers->count(),
                    'obtained' => round($obtained, 2),
                    'possible' => round($possible, 2),
                    'percentage' => $possible > 0 ? round($obtained / $possible * 100, 2) : null,
                ],
                'conduct_records' => (int) ($conduct[$yearId] ?? 0),
            ];
        });

        return [
            'student' => [
                'id' => $student->id,
                'admission_no' => $student->admission_no,
                'name' => $student->full_name,
            ],
            'years' => $years,
            'summary' => [
                'years' => $years->count(),
                'attendance_percentage' => $this->percentage(
                    (int) $attendance->sum('attended'),
                    (int) $attendance->sum('total'),
                ),
                'conduct_records' => (int) $conduct->sum(),
            ],
        ];
    }

    /**
     * Income vs expense movement from the posted ledger for a period.
     *
     * @return array<string, mixed>
     */
    public function financialSummary(array $filters): array
    {
        $rows = JournalLine::query()
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->join('chart_of_accounts', 'chart_of_accounts.id', '=', 'journal_lines.chart_of_account_id')
            ->whereIn('journal_entries.status', [JournalStatus::Posted->value, JournalStatus::Reversed->value])
            ->whereIn('chart_of_accounts.account_type', [AccountType::Income->value, AccountType::Expense->value])
            ->when($filters['fiscal_year_id'] ?? null, fn (Builder $q, $year) => $q->where('journal_entries.fiscal_year_id', $year))
            ->when($filters['from'] ?? null, fn (Builder $q, $from) => $q->whereDate('journal_entries.entry_date', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $q, $to) => $q->whereDate('journal_entries.entry_date', '<=', $to))
            ->groupBy('chart_of_accounts.account_type')
            ->select([
                'chart_of_accounts.account_type',
                DB::raw('SUM(journal_lines.debit) as total_debit'),
                DB::raw('SUM(journal_lines.credit) as total_credit'),
            ])
            ->get();

        $income = 0.0;
        $expense = 0.0;

        foreach ($rows as $row) {
            $movement = (float) $row->total_credit - (float) $row->total_debit;

            if ($row->account_type === AccountType::Income->value) {
                $income = $movement;
            } elseif ($row->account_type === AccountType::Expense->value) {
                $expense = -$movement;
            }
        }

        return [
            'filters' => [
                'fiscal_year_id' => $filters['fiscal_year_id'] ?? null,
                'from' => $filters['from'] ?? null,
                'to' => $filters['to'] ?? null,
            ],
            'income' => round($income, 2),
            'expense' => round($expense, 2),
            'surplus' => round($income - $expense, 2),
            'surplus_percentage' => $income > 0 ? round(($income - $expense) / $income * 100, 2) : null,
        ];
    }

    /**
     * Payroll cost report grouped by period.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function payrollSummary(array $filters): array
    {
        $from = isset($filters['from']) ? CarbonImmutable::parse($filters['from'])->format('Y-m') : null;
        $to = isset($filters['to']) ? CarbonImmutable::parse($filters['to'])->format('Y-m') : null;

        $runs = PayrollRun::query()
            ->when($from, fn (Builder $q, $period) => $q->where('period', '>=', $period))
            ->when($to, fn (Builder $q, $period) => $q->where('period', '<=', $period))
            ->orderBy('period')
            ->get();

        return [
            'filters' => [
                'from' => $filters['from'] ?? null,
                'to' => $filters['to'] ?? null,
            ],
            'totals' => [
                'runs' => $runs->count(),
                'gross' => round((float) $runs->sum('total_gross'), 2),
                'deductions' => round((float) $runs->sum('total_deductions'), 2),
                'net' => round((float) $runs->sum('total_net'), 2),
                'approved' => $runs->where('status', PayrollRunStatus::Approved)->count(),
                'paid' => $runs->where('status', PayrollRunStatus::Paid)->count(),
            ],
            'by_period' => $runs->map(fn (PayrollRun $run) => [
                'id' => $run->id,
                'period' => $run->period,
                'status' => $run->status?->value ?? $run->status,
                'gross' => round((float) $run->total_gross, 2),
                'deductions' => round((float) $run->total_deductions, 2),
                'net' => round((float) $run->total_net, 2),
            ])->values(),
        ];
    }

    /**
     * Cross-campus roll-up for the Super User / product owner.
     *
     * @return array<string, mixed>
     */
    public function platformOverview(): array
    {
        $institutions = Institution::query()->withCount('campuses')->orderBy('name')->get();

        $studentsByInstitution = Student::query()
            ->select('institution_id', DB::raw('count(*) as total'))
            ->groupBy('institution_id')
            ->pluck('total', 'institution_id');

        $staffByInstitution = StaffMember::query()
            ->select('institution_id', DB::raw('count(*) as total'))
            ->groupBy('institution_id')
            ->pluck('total', 'institution_id');

        return [
            'totals' => [
                'institutions' => $institutions->count(),
                'campuses' => (int) Campus::query()->count(),
                'students' => (int) Student::query()->count(),
                'staff' => (int) StaffMember::query()->count(),
                'active_enrollments' => (int) StudentEnrollment::query()->where('status', 'active')->count(),
            ],
            'institutions' => $institutions->map(fn (Institution $institution) => [
                'id' => $institution->id,
                'name' => $institution->name,
                'code' => $institution->code,
                'campuses' => $institution->campuses_count,
                'students' => (int) ($studentsByInstitution[$institution->id] ?? 0),
                'staff' => (int) ($staffByInstitution[$institution->id] ?? 0),
            ])->values(),
        ];
    }

    /**
     * @return array<int, string>
     */
    private function employedStatuses(): array
    {
        return array_values(array_map(
            fn (StaffStatus $status) => $status->value,
            array_filter(StaffStatus::cases(), fn (StaffStatus $status) => $status->isEmployed()),
        ));
    }

    private function percentage(int $part, int $total): ?float
    {
        return $total > 0 ? round($part / $total * 100, 2) : null;
    }
}
