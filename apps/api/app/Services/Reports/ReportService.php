<?php

namespace App\Services\Reports;

use App\Enums\AccountType;
use App\Enums\AdmissionStatus;
use App\Enums\ConductStatus;
use App\Enums\EnrollmentStatus;
use App\Enums\ExamStatus;
use App\Enums\IncomeStatus;
use App\Enums\JournalStatus;
use App\Enums\LeaveStatus;
use App\Enums\PaymentStatus;
use App\Enums\PayrollRunStatus;
use App\Enums\ScholarshipAwardStatus;
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
use App\Models\GradeScale;
use App\Models\Institution;
use App\Models\JournalLine;
use App\Models\LeaveRequest;
use App\Models\OtherIncome;
use App\Models\PayrollRun;
use App\Models\ScholarshipAward;
use App\Models\StaffAttendance;
use App\Models\StaffMember;
use App\Models\Student;
use App\Models\StudentAttendance;
use App\Models\StudentEnrollment;
use App\Models\User;
use App\Models\TeachingAssignment;
use App\Support\ReportPeriod;
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
    public function campusDashboard(?User $viewer = null): array
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

        $postedPayments = FeePayment::query()->where('status', PaymentStatus::Posted->value);

        $collectionsByMonth = collect(range(5, 0))->map(function (int $monthsBack) use ($today, $postedPayments) {
            $month = $today->subMonths($monthsBack);

            $total = (clone $postedPayments)
                ->whereBetween('payment_date', [$month->startOfMonth()->toDateString(), $month->endOfMonth()->toDateString()])
                ->sum('amount');

            return [
                'month' => $month->format('Y-m'),
                'label' => $month->translatedFormat('M'),
                'total' => round((float) $total, 2),
            ];
        })->values();

        $vouchersByStatus = FeeVoucher::query()
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($count) => (int) $count);

        $admissionsByStatus = Admission::query()
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status')
            ->map(fn ($count) => (int) $count);

        $dashboard = [
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
            'collections_by_month' => $collectionsByMonth,
            'vouchers_by_status' => $vouchersByStatus,
            'admissions_by_status' => $admissionsByStatus,
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

        return $viewer === null ? $dashboard : $this->scopeDashboard($dashboard, $viewer);
    }

    /**
     * Strip dashboard sections the viewer has no report permission for, so a
     * department role never receives another department's aggregate figures.
     *
     * @param  array<string, mixed>  $dashboard
     * @return array<string, mixed>
     */
    private function scopeDashboard(array $dashboard, User $viewer): array
    {
        if ($viewer->isPlatformAdmin()) {
            return $dashboard;
        }

        $sections = [
            'students_active' => 'report.students',
            'students_by_gender' => 'report.students',
            'enrollments_active' => 'report.students',
            'admissions_pending' => 'report.students',
            'admissions_by_status' => 'report.students',
            'scholarships_active' => 'report.students',
            'staff_employed' => 'report.staff',
            'leave_pending' => 'report.staff',
            'payroll_draft_runs' => 'report.payroll',
            'unpaid_vouchers' => 'report.finance',
            'outstanding_fees' => 'report.finance',
            'fees_collected_this_month' => 'report.finance',
            'collections_by_month' => 'report.finance',
            'vouchers_by_status' => 'report.finance',
            'exams_scheduled' => 'report.results',
            'conduct_open' => 'report.students',
            'upcoming_events' => 'report.campus',
        ];

        foreach ($sections as $key => $permission) {
            if (! $viewer->can($permission)) {
                unset($dashboard[$key]);
            }
        }

        return $dashboard;
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
        $period = ReportPeriod::fromFilters($filters);
        $students = Student::query();

        $admissions = Admission::query()
            ->when($period->from, fn (Builder $q, $from) => $q->whereDate('applied_on', '>=', $from->toDateString()))
            ->when($period->to, fn (Builder $q, $to) => $q->whereDate('applied_on', '<=', $to->toDateString()))
            ->when($filters['academic_year_id'] ?? null, fn (Builder $q, $year) => $q->where('academic_year_id', $year));

        $enrollments = StudentEnrollment::query()
            ->when($period->from, fn (Builder $q, $from) => $q->whereDate('starts_on', '>=', $from->toDateString()))
            ->when($period->to, fn (Builder $q, $to) => $q->whereDate('starts_on', '<=', $to->toDateString()))
            ->when($filters['academic_year_id'] ?? null, fn (Builder $q, $year) => $q->where('academic_year_id', $year));

        $awards = ScholarshipAward::query()
            ->with('scholarship')
            ->where('status', ScholarshipAwardStatus::Active->value)
            ->when($period->from, fn (Builder $q, $from) => $q->whereDate('awarded_on', '>=', $from->toDateString()))
            ->when($period->to, fn (Builder $q, $to) => $q->whereDate('awarded_on', '<=', $to->toDateString()))
            ->when($filters['academic_year_id'] ?? null, fn (Builder $q, $year) => $q->where('academic_year_id', $year))
            ->get();

        $events = AcademicEvent::query()
            ->when($period->from, fn (Builder $q, $from) => $q->whereDate('starts_on', '>=', $from->toDateString()))
            ->when($period->to, fn (Builder $q, $to) => $q->whereDate('ends_on', '<=', $to->toDateString()));

        $scholarshipValue = $awards->sum(fn (ScholarshipAward $award) => (float) ($award->value_override ?? $award->scholarship?->value ?? 0));

        $series = $this->progressSeries($period, $filters['academic_year_id'] ?? null);

        return [
            'period' => $period->meta(),
            'filters' => [
                'from' => $period->from?->toDateString(),
                'to' => $period->to?->toDateString(),
                'academic_year_id' => $filters['academic_year_id'] ?? null,
            ],
            'students' => [
                'total' => (int) (clone $students)->count(),
                'active' => (int) (clone $students)->where('status', StudentStatus::Active->value)->count(),
                'by_status' => (clone $students)
                    ->select('status', DB::raw('count(*) as total'))
                    ->groupBy('status')
                    ->get()
                    ->map(fn ($row) => [
                        'status' => $this->enumValue($row->status),
                        'total' => (int) $row->total,
                    ])->values(),
                'by_gender' => (clone $students)
                    ->select('gender', DB::raw('count(*) as total'))
                    ->groupBy('gender')
                    ->get()
                    ->map(fn ($row) => [
                        'gender' => $this->enumValue($row->gender),
                        'total' => (int) $row->total,
                    ])->values(),
            ],
            'admissions' => [
                'total' => (int) (clone $admissions)->count(),
                'by_status' => (clone $admissions)
                    ->select('status', DB::raw('count(*) as total'))
                    ->groupBy('status')
                    ->get()
                    ->map(fn ($row) => [
                        'status' => $this->enumValue($row->status),
                        'total' => (int) $row->total,
                    ])->values(),
            ],
            'enrollments' => [
                'total' => (int) (clone $enrollments)->count(),
                'by_status' => (clone $enrollments)
                    ->select('status', DB::raw('count(*) as total'))
                    ->groupBy('status')
                    ->get()
                    ->map(fn ($row) => [
                        'status' => $this->enumValue($row->status),
                        'total' => (int) $row->total,
                    ])->values(),
            ],
            'scholarships' => [
                'active_awards' => $awards->count(),
                'total_value' => round((float) $scholarshipValue, 2),
                'by_type' => $awards
                    ->groupBy(fn (ScholarshipAward $award) => $award->scholarship?->type?->value ?? 'unknown')
                    ->map(fn ($group, $type) => [
                        'type' => $type,
                        'awards' => $group->count(),
                        'value' => round((float) $group->sum(fn ($a) => (float) ($a->value_override ?? $a->scholarship?->value ?? 0)), 2),
                    ])->values(),
            ],
            'events' => [
                'total' => (int) (clone $events)->count(),
            ],
            'series' => $series,
        ];
    }

    /**
     * Admissions, enrollments and scholarship awards bucketed over the period.
     *
     * @return array<int, array<string, mixed>>
     */
    private function progressSeries(ReportPeriod $period, mixed $academicYearId): array
    {
        $admissions = Admission::query()
            ->when($period->from, fn (Builder $q, $from) => $q->whereDate('applied_on', '>=', $from->toDateString()))
            ->when($period->to, fn (Builder $q, $to) => $q->whereDate('applied_on', '<=', $to->toDateString()))
            ->when($academicYearId, fn (Builder $q, $year) => $q->where('academic_year_id', $year))
            ->select($period->selectBucket('applied_on'))
            ->selectRaw('count(*) as admissions')
            ->groupBy('bucket')
            ->orderBy('bucket')
            ->get()
            ->map(fn ($row) => [
                'key' => (string) $row->bucket,
                'label' => $period->labelForKey((string) $row->bucket),
                'admissions' => (int) $row->admissions,
            ])->all();

        $enrollments = StudentEnrollment::query()
            ->when($period->from, fn (Builder $q, $from) => $q->whereDate('starts_on', '>=', $from->toDateString()))
            ->when($period->to, fn (Builder $q, $to) => $q->whereDate('starts_on', '<=', $to->toDateString()))
            ->when($academicYearId, fn (Builder $q, $year) => $q->where('academic_year_id', $year))
            ->select($period->selectBucket('starts_on'))
            ->selectRaw('count(*) as enrollments')
            ->groupBy('bucket')
            ->orderBy('bucket')
            ->get()
            ->map(fn ($row) => [
                'key' => (string) $row->bucket,
                'label' => $period->labelForKey((string) $row->bucket),
                'enrollments' => (int) $row->enrollments,
            ])->all();

        $awards = ScholarshipAward::query()
            ->where('status', ScholarshipAwardStatus::Active->value)
            ->when($period->from, fn (Builder $q, $from) => $q->whereDate('awarded_on', '>=', $from->toDateString()))
            ->when($period->to, fn (Builder $q, $to) => $q->whereDate('awarded_on', '<=', $to->toDateString()))
            ->when($academicYearId, fn (Builder $q, $year) => $q->where('academic_year_id', $year))
            ->select($period->selectBucket('awarded_on'))
            ->selectRaw('count(*) as awards')
            ->groupBy('bucket')
            ->orderBy('bucket')
            ->get()
            ->map(fn ($row) => [
                'key' => (string) $row->bucket,
                'label' => $period->labelForKey((string) $row->bucket),
                'awards' => (int) $row->awards,
            ])->all();

        $merged = [];

        foreach ([$admissions, $enrollments, $awards] as $rows) {
            foreach ($rows as $row) {
                $merged[$row['key']] = array_merge(
                    $merged[$row['key']] ?? ['key' => $row['key'], 'label' => $row['label']],
                    array_diff_key($row, ['key' => true, 'label' => true]),
                );
            }
        }

        ksort($merged);

        return $period->fill(
            $period->buckets(),
            array_values($merged),
            ['admissions' => 0, 'enrollments' => 0, 'awards' => 0],
        );
    }

    /**
     * Attendance rates for a class or the whole campus over a period.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function attendanceSummary(array $filters): array
    {
        $period = ReportPeriod::fromFilters($filters);

        $query = StudentAttendance::query()
            ->when($filters['class_room_id'] ?? null, fn (Builder $q, $class) => $q->where('class_room_id', $class))
            ->when($filters['academic_year_id'] ?? null, fn (Builder $q, $year) => $q->where('academic_year_id', $year))
            ->when($period->from, fn (Builder $q, $from) => $q->whereDate('attendance_date', '>=', $from->toDateString()))
            ->when($period->to, fn (Builder $q, $to) => $q->whereDate('attendance_date', '<=', $to->toDateString()));

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
                'class_room' => $row->class_room_id
                    ? optional(ClassRoom::find($row->class_room_id))->name
                    : 'Unassigned',
                'total' => (int) $row->total,
                'attended' => (int) $row->attended,
                'absent' => (int) $row->absent,
                'attendance_percentage' => $this->percentage((int) $row->attended, (int) $row->total),
            ])->values();

        $seriesRows = (clone $query)
            ->select($period->selectBucket('attendance_date'))
            ->selectRaw('count(*) as total')
            ->selectRaw("sum(case when status in ('present','late') then 1 else 0 end) as attended")
            ->selectRaw("sum(case when status = 'absent' then 1 else 0 end) as absent")
            ->selectRaw("sum(case when status = 'late' then 1 else 0 end) as late")
            ->selectRaw("sum(case when status = 'leave' then 1 else 0 end) as `leave`")
            ->selectRaw("sum(case when status = 'excused' then 1 else 0 end) as excused")
            ->groupBy('bucket')
            ->orderBy('bucket')
            ->get()
            ->map(fn ($row) => [
                'key' => (string) $row->bucket,
                'label' => $period->labelForKey((string) $row->bucket),
                'total' => (int) $row->total,
                'attended' => (int) $row->attended,
                'absent' => (int) $row->absent,
                'late' => (int) $row->late,
                'leave' => (int) $row->leave,
                'excused' => (int) $row->excused,
                'attendance_percentage' => $this->percentage((int) $row->attended, (int) $row->total),
            ])->all();

        $series = $period->fill($period->buckets(), $seriesRows, [
            'total' => 0,
            'attended' => 0,
            'absent' => 0,
            'late' => 0,
            'leave' => 0,
            'excused' => 0,
            'attendance_percentage' => null,
        ]);

        return [
            'period' => $period->meta(),
            'filters' => [
                'class_room_id' => $filters['class_room_id'] ?? null,
                'academic_year_id' => $filters['academic_year_id'] ?? null,
                'from' => $period->from?->toDateString(),
                'to' => $period->to?->toDateString(),
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
            'series' => $series,
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

        $graded = $marks->filter(fn (ExamMark $mark) => $mark->effective_marks !== null);
        $percentages = $graded->map(function (ExamMark $mark) use ($papers) {
            $max = (float) $papers->get($mark->exam_paper_id)->max_marks;

            return $max > 0 ? (float) $mark->effective_marks / $max * 100 : 0.0;
        });

        $passing = $marks->filter(function (ExamMark $mark) use ($papers) {
            if ($mark->effective_marks === null) {
                return false;
            }

            return $mark->effective_marks >= (float) $papers->get($mark->exam_paper_id)->pass_marks;
        })->count();

        $byPaper = $marks->groupBy('exam_paper_id')->map(function ($group, $paperId) use ($papers) {
            $paper = $papers->get($paperId);
            $max = (float) $paper->max_marks;
            $obtained = (float) $group->sum(fn (ExamMark $m) => $m->effective_marks ?? 0.0);
            $count = $group->filter(fn (ExamMark $m) => $m->effective_marks !== null)->count();
            $passed = $group->filter(fn (ExamMark $m) => $m->effective_marks !== null && $m->effective_marks >= (float) $paper->pass_marks)->count();

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

        $scale = GradeScale::query()
            ->with('items')
            ->where('is_active', true)
            ->orderByDesc('is_default')
            ->orderBy('id')
            ->first();

        $gradeDistribution = [];

        if ($scale !== null) {
            $buckets = $scale->items->map(fn ($item) => [
                'grade' => $item->grade,
                'min_percentage' => (float) $item->min_percentage,
                'max_percentage' => (float) $item->max_percentage,
                'total' => 0,
            ])->all();

            foreach ($percentages as $value) {
                foreach ($buckets as $index => $bucket) {
                    if ($value >= $bucket['min_percentage'] && $value <= $bucket['max_percentage']) {
                        $buckets[$index]['total']++;
                        break;
                    }
                }
            }

            $gradeDistribution = $buckets;
        }

        $scoreBands = [
            ['band' => '0-39', 'min' => 0, 'max' => 39.999, 'total' => 0],
            ['band' => '40-49', 'min' => 40, 'max' => 49.999, 'total' => 0],
            ['band' => '50-59', 'min' => 50, 'max' => 59.999, 'total' => 0],
            ['band' => '60-69', 'min' => 60, 'max' => 69.999, 'total' => 0],
            ['band' => '70-79', 'min' => 70, 'max' => 79.999, 'total' => 0],
            ['band' => '80+', 'min' => 80, 'max' => 100.001, 'total' => 0],
        ];

        foreach ($percentages as $value) {
            foreach ($scoreBands as $index => $band) {
                if ($value >= $band['min'] && $value <= $band['max']) {
                    $scoreBands[$index]['total']++;
                    break;
                }
            }
        }

        return [
            'period' => [
                'granularity' => 'exam',
                'from' => $exam->starts_on?->toDateString(),
                'to' => $exam->ends_on?->toDateString(),
                'label' => $exam->name,
            ],
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
            'grade_distribution' => $gradeDistribution,
            'score_bands' => $scoreBands,
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
        $period = ReportPeriod::fromFilters($filters);
        $asOn = $filters['as_on'] ?? $period->to?->toDateString() ?? CarbonImmutable::today()->toDateString();

        $employed = StaffMember::query()
            ->whereIn('status', $this->employedStatuses())
            ->whereDate('joining_date', '<=', $asOn)
            ->where(fn (Builder $q) => $q->whereNull('leaving_date')->orWhereDate('leaving_date', '>=', $asOn));

        $attendance = StaffAttendance::query()
            ->when($period->from, fn (Builder $q, $from) => $q->whereDate('attendance_date', '>=', $from->toDateString()))
            ->when($period->to, fn (Builder $q, $to) => $q->whereDate('attendance_date', '<=', $to->toDateString()));

        $leaves = LeaveRequest::query()
            ->when($period->from, fn (Builder $q, $from) => $q->whereDate('from_date', '>=', $from->toDateString()))
            ->when($period->to, fn (Builder $q, $to) => $q->whereDate('to_date', '<=', $to->toDateString()));

        $attendanceRows = (clone $attendance)
            ->select($period->selectBucket('attendance_date'))
            ->selectRaw('count(*) as total')
            ->selectRaw("sum(case when status = 'present' then 1 else 0 end) as present")
            ->selectRaw("sum(case when status = 'absent' then 1 else 0 end) as absent")
            ->selectRaw("sum(case when status = 'leave' then 1 else 0 end) as `leave`")
            ->groupBy('bucket')
            ->orderBy('bucket')
            ->get()
            ->map(fn ($row) => [
                'key' => (string) $row->bucket,
                'label' => $period->labelForKey((string) $row->bucket),
                'total' => (int) $row->total,
                'present' => (int) $row->present,
                'absent' => (int) $row->absent,
                'leave' => (int) $row->leave,
            ])->all();

        $leaveRows = (clone $leaves)
            ->select($period->selectBucket('from_date'))
            ->selectRaw('count(*) as total')
            ->selectRaw("sum(case when status = 'approved' then 1 else 0 end) as approved")
            ->groupBy('bucket')
            ->orderBy('bucket')
            ->get()
            ->map(fn ($row) => [
                'key' => (string) $row->bucket,
                'label' => $period->labelForKey((string) $row->bucket),
                'leave_requests' => (int) $row->total,
                'leave_approved' => (int) $row->approved,
            ])->all();

        $merged = [];

        foreach ([$attendanceRows, $leaveRows] as $rows) {
            foreach ($rows as $row) {
                $merged[$row['key']] = array_merge(
                    $merged[$row['key']] ?? ['key' => $row['key'], 'label' => $row['label']],
                    array_diff_key($row, ['key' => true, 'label' => true]),
                );
            }
        }

        ksort($merged);

        $series = $period->fill($period->buckets(), array_values($merged), [
            'total' => 0,
            'present' => 0,
            'absent' => 0,
            'leave' => 0,
            'leave_requests' => 0,
            'leave_approved' => 0,
        ]);

        return [
            'period' => $period->meta(),
            'filters' => [
                'as_on' => $asOn,
                'from' => $period->from?->toDateString(),
                'to' => $period->to?->toDateString(),
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

            $obtained = (float) $marks->sum(fn (ExamMark $m) => $m->effective_marks ?? 0.0);
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
            'period' => [
                'granularity' => 'academic_year',
                'from' => null,
                'to' => null,
                'label' => 'Year by year',
            ],
            'student' => [
                'id' => $student->id,
                'admission_no' => $student->admission_no,
                'name' => $student->full_name,
            ],
            'series' => $years->reverse()->map(fn (array $year) => [
                'key' => (string) $year['academic_year_id'],
                'label' => $year['academic_year'] ?? (string) $year['academic_year_id'],
                'attendance_percentage' => $year['attendance']['attendance_percentage'] ?? 0,
                'academic_percentage' => $year['academics']['percentage'] ?? 0,
                'conduct_records' => $year['conduct_records'],
            ])->values(),
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
        $period = ReportPeriod::fromFilters($filters);

        $rows = JournalLine::query()
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->join('chart_of_accounts', 'chart_of_accounts.id', '=', 'journal_lines.chart_of_account_id')
            ->whereIn('journal_entries.status', [JournalStatus::Posted->value, JournalStatus::Reversed->value])
            ->whereIn('chart_of_accounts.account_type', [AccountType::Income->value, AccountType::Expense->value])
            ->when($filters['fiscal_year_id'] ?? null, fn (Builder $q, $year) => $q->where('journal_entries.fiscal_year_id', $year))
            ->when($period->from, fn (Builder $q, $from) => $q->whereDate('journal_entries.entry_date', '>=', $from->toDateString()))
            ->when($period->to, fn (Builder $q, $to) => $q->whereDate('journal_entries.entry_date', '<=', $to->toDateString()))
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

        $seriesRows = JournalLine::query()
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->join('chart_of_accounts', 'chart_of_accounts.id', '=', 'journal_lines.chart_of_account_id')
            ->whereIn('journal_entries.status', [JournalStatus::Posted->value, JournalStatus::Reversed->value])
            ->whereIn('chart_of_accounts.account_type', [AccountType::Income->value, AccountType::Expense->value])
            ->when($filters['fiscal_year_id'] ?? null, fn (Builder $q, $year) => $q->where('journal_entries.fiscal_year_id', $year))
            ->when($period->from, fn (Builder $q, $from) => $q->whereDate('journal_entries.entry_date', '>=', $from->toDateString()))
            ->when($period->to, fn (Builder $q, $to) => $q->whereDate('journal_entries.entry_date', '<=', $to->toDateString()))
            ->select($period->selectBucket('journal_entries.entry_date'))
            ->selectRaw("SUM(case when chart_of_accounts.account_type = 'income' then journal_lines.credit - journal_lines.debit else 0 end) as income")
            ->selectRaw("SUM(case when chart_of_accounts.account_type = 'expense' then journal_lines.debit - journal_lines.credit else 0 end) as expense")
            ->groupBy('bucket')
            ->orderBy('bucket')
            ->get()
            ->map(fn ($row) => [
                'key' => (string) $row->bucket,
                'label' => $period->labelForKey((string) $row->bucket),
                'income' => round((float) $row->income, 2),
                'expense' => round((float) $row->expense, 2),
                'surplus' => round((float) $row->income - (float) $row->expense, 2),
            ])->all();

        $series = $period->fill($period->buckets(), $seriesRows, [
            'income' => 0.0,
            'expense' => 0.0,
            'surplus' => 0.0,
        ]);

        return [
            'period' => $period->meta(),
            'filters' => [
                'fiscal_year_id' => $filters['fiscal_year_id'] ?? null,
                'from' => $period->from?->toDateString(),
                'to' => $period->to?->toDateString(),
            ],
            'income' => round($income, 2),
            'expense' => round($expense, 2),
            'surplus' => round($income - $expense, 2),
            'surplus_percentage' => $income > 0 ? round(($income - $expense) / $income * 100, 2) : null,
            'series' => $series,
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
        $period = ReportPeriod::fromFilters($filters);
        $from = $period->from?->format('Y-m');
        $to = $period->to?->format('Y-m');

        $runs = PayrollRun::query()
            ->when($from, fn (Builder $q, $period) => $q->where('period', '>=', $period))
            ->when($to, fn (Builder $q, $period) => $q->where('period', '<=', $period))
            ->orderBy('period')
            ->get();

        $byPeriod = $runs->map(fn (PayrollRun $run) => [
            'id' => $run->id,
            'period' => $run->period,
            'status' => $run->status?->value ?? $run->status,
            'gross' => round((float) $run->total_gross, 2),
            'deductions' => round((float) $run->total_deductions, 2),
            'net' => round((float) $run->total_net, 2),
        ])->values();

        /*
         * Payroll is inherently monthly, so the chart series is always keyed by
         * `Y-m`. Building the skeleton by hand keeps daily/weekly requests from
         * producing hundreds of empty buckets and keeps `all`/`year` aligned
         * with the monthly run keys.
         */
        $monthly = [];

        foreach ($byPeriod as $run) {
            $monthly[$run['period']] = $run;
        }

        $monthKeys = [];

        if ($period->from !== null && $period->to !== null) {
            $cursor = $period->from->startOfMonth();

            while ($cursor->lessThanOrEqualTo($period->to)) {
                $monthKeys[] = $cursor->format('Y-m');
                $cursor = $cursor->addMonth();
            }
        } else {
            $monthKeys = array_keys($monthly);
            sort($monthKeys);
        }

        $series = array_map(fn (string $month) => [
            'key' => $month,
            'label' => CarbonImmutable::parse($month.'-01')->format('M Y'),
            'gross' => (float) ($monthly[$month]['gross'] ?? 0),
            'deductions' => (float) ($monthly[$month]['deductions'] ?? 0),
            'net' => (float) ($monthly[$month]['net'] ?? 0),
        ], $monthKeys);

        return [
            'period' => $period->meta(),
            'filters' => [
                'from' => $period->from?->toDateString(),
                'to' => $period->to?->toDateString(),
            ],
            'totals' => [
                'runs' => $runs->count(),
                'gross' => round((float) $runs->sum('total_gross'), 2),
                'deductions' => round((float) $runs->sum('total_deductions'), 2),
                'net' => round((float) $runs->sum('total_net'), 2),
                'approved' => $runs->where('status', PayrollRunStatus::Approved)->count(),
                'paid' => $runs->where('status', PayrollRunStatus::Paid)->count(),
            ],
            'by_period' => $byPeriod,
            'series' => $series,
        ];
    }

    /**
     * Cross-campus roll-up for an Institution Head.
     *
     * @return array<string, mixed>
     */
    public function institutionOverview(): array
    {
        $today = CarbonImmutable::today();
        $campuses = Campus::query()->orderBy('name')->get();

        $studentsByCampus = Student::query()
            ->select('campus_id', DB::raw('count(*) as total'))
            ->groupBy('campus_id')
            ->pluck('total', 'campus_id');

        $staffByCampus = StaffMember::query()
            ->select('campus_id', DB::raw('count(*) as total'))
            ->groupBy('campus_id')
            ->pluck('total', 'campus_id');

        $unpaid = FeeVoucher::query()
            ->whereNotIn('status', [VoucherStatus::Void->value])
            ->whereColumn('paid_amount', '<', 'amount');

        $outstandingByCampus = (clone $unpaid)
            ->select('campus_id', DB::raw('sum(amount - paid_amount) as total'))
            ->groupBy('campus_id')
            ->pluck('total', 'campus_id');

        $collectedByCampus = FeePayment::query()
            ->where('status', PaymentStatus::Posted->value)
            ->whereBetween('payment_date', [
                $today->startOfMonth()->toDateString(),
                $today->endOfMonth()->toDateString(),
            ])
            ->select('campus_id', DB::raw('sum(amount) as total'))
            ->groupBy('campus_id')
            ->pluck('total', 'campus_id');

        $collectedThisMonth = FeePayment::query()
            ->where('status', PaymentStatus::Posted->value)
            ->whereBetween('payment_date', [
                $today->startOfMonth()->toDateString(),
                $today->endOfMonth()->toDateString(),
            ])
            ->sum('amount');

        return [
            'as_on' => $today->toDateString(),
            'totals' => [
                'campuses' => $campuses->count(),
                'students' => (int) Student::query()->count(),
                'staff' => (int) StaffMember::query()->count(),
                'active_enrollments' => (int) StudentEnrollment::query()->where('status', 'active')->count(),
                'unpaid_vouchers' => (int) (clone $unpaid)->count(),
                'outstanding_fees' => round(
                    (float) (clone $unpaid)->sum('amount') - (float) (clone $unpaid)->sum('paid_amount'),
                    2
                ),
                'fees_collected_this_month' => round((float) $collectedThisMonth, 2),
            ],
            'campuses' => $campuses->map(fn (Campus $campus) => [
                'id' => $campus->id,
                'name' => $campus->name,
                'code' => $campus->code,
                'students' => (int) ($studentsByCampus[$campus->id] ?? 0),
                'staff' => (int) ($staffByCampus[$campus->id] ?? 0),
                'outstanding_fees' => round((float) ($outstandingByCampus[$campus->id] ?? 0), 2),
                'fees_collected_this_month' => round((float) ($collectedByCampus[$campus->id] ?? 0), 2),
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
     * Campus-by-campus comparison for an institution head, combining the core
     * report totals into one table so an owner can see every campus side by
     * side over the same period.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function campusComparison(array $filters): array
    {
        $period = ReportPeriod::fromFilters($filters);

        $campuses = Campus::query()->orderBy('name')->get();
        $campusIds = $campuses->pluck('id')->all();

        $studentsByCampus = Student::query()
            ->select('campus_id', DB::raw('count(*) as total'))
            ->selectRaw("sum(case when status = 'active' then 1 else 0 end) as active")
            ->groupBy('campus_id')
            ->get()
            ->keyBy('campus_id');

        $staffByCampus = StaffMember::query()
            ->whereIn('status', $this->employedStatuses())
            ->select('campus_id', DB::raw('count(*) as total'))
            ->groupBy('campus_id')
            ->pluck('total', 'campus_id');

        $attendanceByCampus = StudentAttendance::query()
            ->when($period->from, fn (Builder $q, $from) => $q->whereDate('attendance_date', '>=', $from->toDateString()))
            ->when($period->to, fn (Builder $q, $to) => $q->whereDate('attendance_date', '<=', $to->toDateString()))
            ->select('campus_id', DB::raw('count(*) as total'))
            ->selectRaw("sum(case when status in ('present','late') then 1 else 0 end) as attended")
            ->groupBy('campus_id')
            ->get()
            ->keyBy('campus_id');

        $admissionsByCampus = Admission::query()
            ->when($period->from, fn (Builder $q, $from) => $q->whereDate('applied_on', '>=', $from->toDateString()))
            ->when($period->to, fn (Builder $q, $to) => $q->whereDate('applied_on', '<=', $to->toDateString()))
            ->select('campus_id', DB::raw('count(*) as total'))
            ->groupBy('campus_id')
            ->pluck('total', 'campus_id');

        $incomeByCampus = $this->ledgerByCampus(AccountType::Income->value, $period);
        $expenseByCampus = $this->ledgerByCampus(AccountType::Expense->value, $period);

        $payrollByCampus = PayrollRun::query()
            ->when($period->from, fn (Builder $q) => $q->where('period', '>=', $period->from?->format('Y-m')))
            ->when($period->to, fn (Builder $q) => $q->where('period', '<=', $period->to?->format('Y-m')))
            ->select('campus_id', DB::raw('sum(total_net) as total'))
            ->groupBy('campus_id')
            ->pluck('total', 'campus_id');

        $rows = $campuses->map(function (Campus $campus) use (
            $studentsByCampus,
            $staffByCampus,
            $attendanceByCampus,
            $admissionsByCampus,
            $incomeByCampus,
            $expenseByCampus,
            $payrollByCampus,
        ) {
            $students = $studentsByCampus->get($campus->id);
            $attendance = $attendanceByCampus->get($campus->id);
            $totalAttendance = (int) ($attendance->total ?? 0);
            $attended = (int) ($attendance->attended ?? 0);
            $income = round((float) ($incomeByCampus[$campus->id] ?? 0), 2);
            $expense = round((float) ($expenseByCampus[$campus->id] ?? 0), 2);

            return [
                'campus_id' => $campus->id,
                'campus' => $campus->name,
                'code' => $campus->code,
                'students' => (int) ($students->total ?? 0),
                'active_students' => (int) ($students->active ?? 0),
                'staff' => (int) ($staffByCampus[$campus->id] ?? 0),
                'admissions' => (int) ($admissionsByCampus[$campus->id] ?? 0),
                'attendance_percentage' => $this->percentage($attended, $totalAttendance),
                'income' => $income,
                'expense' => $expense,
                'surplus' => round($income - $expense, 2),
                'payroll_net' => round((float) ($payrollByCampus[$campus->id] ?? 0), 2),
            ];
        })->values();

        return [
            'period' => $period->meta(),
            'filters' => [
                'from' => $period->from?->toDateString(),
                'to' => $period->to?->toDateString(),
            ],
            'campuses' => $rows,
            'totals' => [
                'campuses' => $rows->count(),
                'students' => (int) $rows->sum('students'),
                'active_students' => (int) $rows->sum('active_students'),
                'staff' => (int) $rows->sum('staff'),
                'admissions' => (int) $rows->sum('admissions'),
                'income' => round((float) $rows->sum('income'), 2),
                'expense' => round((float) $rows->sum('expense'), 2),
                'surplus' => round((float) $rows->sum('surplus'), 2),
                'payroll_net' => round((float) $rows->sum('payroll_net'), 2),
            ],
            'campus_ids' => $campusIds,
        ];
    }

    /**
     * Consolidated single-campus report covering income, payments, students
     * and staff for one period.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function campusReport(array $filters, int $campusId): array
    {
        $period = ReportPeriod::fromFilters($filters);
        $campus = Campus::query()->findOrFail($campusId);
        $figures = $this->campusFigures($period);

        return array_merge([
            'period' => $period->meta(),
            'filters' => [
                'campus_id' => $campus->id,
                'from' => $period->from?->toDateString(),
                'to' => $period->to?->toDateString(),
            ],
            'campus' => [
                'id' => $campus->id,
                'name' => $campus->name,
                'code' => $campus->code,
            ],
        ], $this->campusFigureRow($campus->id, $figures));
    }

    /**
     * Head office roll-up: one row per campus with income, payments, balance,
     * receivables and payables, plus a grand total. Each campus row uses the
     * same figures as campusReport() so the drill-down reconciles exactly.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function headOfficeReport(array $filters): array
    {
        $period = ReportPeriod::fromFilters($filters);
        $campuses = Campus::query()->orderBy('name')->get();
        $figures = $this->campusFigures($period);

        $rows = $campuses->map(fn (Campus $campus) => array_merge([
            'campus_id' => $campus->id,
            'campus' => $campus->name,
            'code' => $campus->code,
        ], $this->campusFigureRow($campus->id, $figures)))->values();

        return [
            'period' => $period->meta(),
            'filters' => [
                'from' => $period->from?->toDateString(),
                'to' => $period->to?->toDateString(),
            ],
            'campuses' => $rows,
            'totals' => [
                'campuses' => $rows->count(),
                'income' => $this->round($rows->sum('income')),
                'payments' => $this->round($rows->sum('payments')),
                'balance' => $this->round($rows->sum('balance')),
                'receivable' => $this->round($rows->sum('receivable')),
                'payable' => $this->round($rows->sum('payable')),
            ],
        ];
    }

    /**
     * Per-campus metric maps shared by both the campus and head office report.
     * Keyed by campus id so a single set of grouped queries can render one
     * campus or every campus without diverging.
     *
     * @return array<string, array<string, array<int, float|int>>>
     */
    private function campusFigures(ReportPeriod $period): array
    {
        $asOn = $period->to?->toDateString() ?? CarbonImmutable::today()->toDateString();

        $feeDue = FeeVoucher::query()
            ->where('status', '!=', VoucherStatus::Void->value)
            ->when($period->from, fn (Builder $q, $from) => $q->whereDate('due_date', '>=', $from->toDateString()))
            ->when($period->to, fn (Builder $q, $to) => $q->whereDate('due_date', '<=', $to->toDateString()))
            ->select('campus_id', DB::raw('sum(amount) as total'))
            ->groupBy('campus_id')
            ->pluck('total', 'campus_id');

        $feeReceived = FeePayment::query()
            ->where('status', PaymentStatus::Posted->value)
            ->when($period->from, fn (Builder $q, $from) => $q->whereDate('payment_date', '>=', $from->toDateString()))
            ->when($period->to, fn (Builder $q, $to) => $q->whereDate('payment_date', '<=', $to->toDateString()))
            ->select('campus_id', DB::raw('sum(amount) as total'))
            ->groupBy('campus_id')
            ->pluck('total', 'campus_id');

        $otherIncome = OtherIncome::query()
            ->where('status', IncomeStatus::Posted->value)
            ->when($period->from, fn (Builder $q, $from) => $q->whereDate('received_on', '>=', $from->toDateString()))
            ->when($period->to, fn (Builder $q, $to) => $q->whereDate('received_on', '<=', $to->toDateString()))
            ->select('campus_id', DB::raw('sum(amount) as total'))
            ->groupBy('campus_id')
            ->pluck('total', 'campus_id');

        /*
         * "Received" is cash collected, so it combines fee receipts and posted
         * other income. "Due" stays the billed fee amount, and their difference
         * is the receivable/advance position shown as R/A.
         */
        $receivedByCampus = [];

        foreach ([$feeReceived->all(), $otherIncome->all()] as $source) {
            foreach ($source as $campusKey => $total) {
                $receivedByCampus[$campusKey] = round(
                    ($receivedByCampus[$campusKey] ?? 0) + (float) $total,
                    2
                );
            }
        }

        $receivable = FeeVoucher::query()
            ->where('status', '!=', VoucherStatus::Void->value)
            ->whereColumn('paid_amount', '<', 'amount')
            ->when($period->to, fn (Builder $q, $to) => $q->whereDate('due_date', '<=', $to->toDateString()))
            ->select('campus_id', DB::raw('sum(amount - paid_amount) as total'))
            ->groupBy('campus_id')
            ->pluck('total', 'campus_id');

        /*
         * Payments follow the double-entry ledger (the same source as the
         * financial summary) because that is where every settlement is posted.
         * Salaries and utilities are split out by their default chart codes;
         * everything else rolls into "others".
         */
        $expenseByCampus = $this->ledgerByCampus(AccountType::Expense->value, $period);

        $salaryCode = (string) config('finance.accounts.salary_expense', '5010');
        $salaries = $this->ledgerByCampus(AccountType::Expense->value, $period, [$salaryCode]);
        $utilities = $this->ledgerByCampus(AccountType::Expense->value, $period, ['5020']);

        $others = [];

        foreach ($expenseByCampus as $campusKey => $total) {
            $others[$campusKey] = round(
                $total
                    - (float) ($salaries[$campusKey] ?? 0)
                    - (float) ($utilities[$campusKey] ?? 0),
                2
            );
        }

        $payable = $this->payableByCampus($period);

        $students = Student::query()->get(['id', 'campus_id', 'status', 'admission_date']);
        $withdrawals = StudentEnrollment::query()
            ->whereIn('status', [EnrollmentStatus::Withdrawn->value, EnrollmentStatus::Transferred->value])
            ->when($period->from, fn (Builder $q, $from) => $q->whereDate('ends_on', '>=', $from->toDateString()))
            ->when($period->to, fn (Builder $q, $to) => $q->whereDate('ends_on', '<=', $to->toDateString()))
            ->select('campus_id', DB::raw('count(distinct student_id) as total'))
            ->groupBy('campus_id')
            ->pluck('total', 'campus_id');

        $staff = StaffMember::query()->get([
            'id', 'campus_id', 'user_id', 'gender', 'status', 'joining_date', 'leaving_date',
        ]);
        $teachingByCampus = TeachingAssignment::query()
            ->where('is_active', true)
            ->whereNotNull('teacher_user_id')
            ->get(['campus_id', 'teacher_user_id'])
            ->groupBy('campus_id')
            ->map(fn ($rows) => $rows->pluck('teacher_user_id')->unique()->flip());

        $studentTotals = [];
        $studentNew = [];
        $studentOngoing = [];
        $staffTotals = [];
        $staffTeaching = [];
        $staffMales = [];
        $staffFemales = [];
        $staffHired = [];
        $staffFired = [];

        foreach ($students as $student) {
            $campusKey = (int) $student->campus_id;
            $admitted = $student->admission_date?->toDateString();
            $onRoll = $admitted === null || $admitted <= $asOn;

            if ($onRoll) {
                $studentTotals[$campusKey] = ($studentTotals[$campusKey] ?? 0) + 1;
            }

            if ($this->enumValue($student->status) === StudentStatus::Active->value && $onRoll) {
                $studentOngoing[$campusKey] = ($studentOngoing[$campusKey] ?? 0) + 1;
            }

            if ($admitted !== null
                && ($period->from === null || $admitted >= $period->from->toDateString())
                && ($period->to === null || $admitted <= $period->to->toDateString())) {
                $studentNew[$campusKey] = ($studentNew[$campusKey] ?? 0) + 1;
            }
        }

        foreach ($staff as $member) {
            $campusKey = (int) $member->campus_id;
            $joined = $member->joining_date?->toDateString();
            $left = $member->leaving_date?->toDateString();
            $employed = in_array($this->enumValue($member->status), $this->employedStatuses(), true)
                && ($joined === null || $joined <= $asOn)
                && ($left === null || $left >= $asOn);

            if ($employed) {
                $staffTotals[$campusKey] = ($staffTotals[$campusKey] ?? 0) + 1;

                $gender = $this->enumValue($member->gender);

                if ($gender === 'male') {
                    $staffMales[$campusKey] = ($staffMales[$campusKey] ?? 0) + 1;
                } elseif ($gender === 'female') {
                    $staffFemales[$campusKey] = ($staffFemales[$campusKey] ?? 0) + 1;
                }

                $teachers = $teachingByCampus->get($campusKey);
                if ($member->user_id !== null && $teachers?->has($member->user_id)) {
                    $staffTeaching[$campusKey] = ($staffTeaching[$campusKey] ?? 0) + 1;
                }
            }

            if ($joined !== null
                && ($period->from === null || $joined >= $period->from->toDateString())
                && ($period->to === null || $joined <= $period->to->toDateString())) {
                $staffHired[$campusKey] = ($staffHired[$campusKey] ?? 0) + 1;
            }

            if ($left !== null
                && ($period->from === null || $left >= $period->from->toDateString())
                && ($period->to === null || $left <= $period->to->toDateString())) {
                $staffFired[$campusKey] = ($staffFired[$campusKey] ?? 0) + 1;
            }
        }

        return [
            'income' => [
                'due' => $feeDue->all(),
                'received' => $receivedByCampus,
                'fees' => $feeReceived->all(),
                'other' => $otherIncome->all(),
                'receivable' => $receivable->all(),
            ],
            'payments' => [
                'salaries' => $salaries,
                'utilities' => $utilities,
                'others' => $others,
                'payable' => $payable,
            ],
            'students' => [
                'total' => $studentTotals,
                'new' => $studentNew,
                'withdrawals' => $withdrawals->all(),
                'ongoing' => $studentOngoing,
            ],
            'staff' => [
                'total' => $staffTotals,
                'teaching' => $staffTeaching,
                'males' => $staffMales,
                'females' => $staffFemales,
                'hired' => $staffHired,
                'fired' => $staffFired,
            ],
        ];
    }

    /**
     * @param  array<string, array<string, array<int, float|int>>>  $figures
     * @return array<string, mixed>
     */
    private function campusFigureRow(int $campusId, array $figures): array
    {
        $due = $this->figure($figures['income']['due'], $campusId);
        $received = $this->figure($figures['income']['received'], $campusId);
        $fees = $this->figure($figures['income']['fees'], $campusId);
        $other = $this->figure($figures['income']['other'], $campusId);
        $receivable = $this->figure($figures['income']['receivable'], $campusId);

        $salaries = $this->figure($figures['payments']['salaries'], $campusId);
        $utilities = $this->figure($figures['payments']['utilities'], $campusId);
        $others = $this->figure($figures['payments']['others'], $campusId);
        $payable = $this->figure($figures['payments']['payable'], $campusId);

        $income = $this->round($received);
        $payments = $this->round($salaries + $utilities + $others);

        $studentTotal = (int) $this->figure($figures['students']['total'], $campusId);
        $staffTotal = (int) $this->figure($figures['staff']['total'], $campusId);
        $teaching = (int) $this->figure($figures['staff']['teaching'], $campusId);

        return [
            'income' => $income,
            'payments' => $payments,
            'balance' => $this->round($income - $payments),
            'receivable' => $this->round($receivable),
            'payable' => $this->round($payable),
            'income_breakdown' => [
                'due' => $this->round($due),
                'received' => $this->round($received),
                'fees' => $this->round($fees),
                'other' => $this->round($other),
                'receivable' => $this->round($receivable),
            ],
            'payments_breakdown' => [
                'salaries' => $this->round($salaries),
                'utilities' => $this->round($utilities),
                'others' => $this->round($others),
                'payable' => $this->round($payable),
            ],
            'students' => [
                'total' => $studentTotal,
                'new_admissions' => (int) $this->figure($figures['students']['new'], $campusId),
                'withdrawals' => (int) $this->figure($figures['students']['withdrawals'], $campusId),
                'ongoing' => (int) $this->figure($figures['students']['ongoing'], $campusId),
            ],
            'staff' => [
                'total' => $staffTotal,
                'teaching' => $teaching,
                'non_teaching' => max($staffTotal - $teaching, 0),
                'males' => (int) $this->figure($figures['staff']['males'], $campusId),
                'females' => (int) $this->figure($figures['staff']['females'], $campusId),
                'hired' => (int) $this->figure($figures['staff']['hired'], $campusId),
                'fired' => (int) $this->figure($figures['staff']['fired'], $campusId),
            ],
        ];
    }

    /**
     * @param  array<int, float|int>  $values
     */
    private function figure(array $values, int $campusId): float
    {
        return (float) ($values[$campusId] ?? 0);
    }

    private function round(float $value): float
    {
        return round($value, 2);
    }

    /**
     * @param  array<int, string>|null  $accountCodes  Restrict to specific chart codes.
     * @return array<int, float>
     */
    private function ledgerByCampus(string $accountType, ReportPeriod $period, ?array $accountCodes = null): array
    {
        return JournalLine::query()
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->join('chart_of_accounts', 'chart_of_accounts.id', '=', 'journal_lines.chart_of_account_id')
            ->whereIn('journal_entries.status', [JournalStatus::Posted->value, JournalStatus::Reversed->value])
            ->where('chart_of_accounts.account_type', $accountType)
            ->when($accountCodes !== null, fn (Builder $q) => $q->whereIn('chart_of_accounts.code', $accountCodes))
            ->when($period->from, fn (Builder $q, $from) => $q->whereDate('journal_entries.entry_date', '>=', $from->toDateString()))
            ->when($period->to, fn (Builder $q, $to) => $q->whereDate('journal_entries.entry_date', '<=', $to->toDateString()))
            ->select('journal_entries.campus_id')
            ->selectRaw(
                $accountType === AccountType::Income->value
                    ? 'SUM(journal_lines.credit - journal_lines.debit) as total'
                    : 'SUM(journal_lines.debit - journal_lines.credit) as total'
            )
            ->groupBy('journal_entries.campus_id')
            ->pluck('total', 'journal_entries.campus_id')
            ->map(fn ($value) => (float) $value)
            ->all();
    }

    /**
     * Outstanding accounts payable per campus, derived from the payable
     * control account on the ledger so it reconciles with the balance sheet.
     *
     * @return array<int, float>
     */
    /**
     * Outstanding accounts payable per campus as at the period end. Unlike the
     * P&L lines this is a cumulative balance, so it is bounded by the end date
     * only and includes every earlier posting.
     *
     * @return array<int, float>
     */
    private function payableByCampus(ReportPeriod $period): array
    {
        return JournalLine::query()
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->join('chart_of_accounts', 'chart_of_accounts.id', '=', 'journal_lines.chart_of_account_id')
            ->whereIn('journal_entries.status', [JournalStatus::Posted->value, JournalStatus::Reversed->value])
            ->where('chart_of_accounts.account_type', AccountType::Liability->value)
            ->whereIn('chart_of_accounts.code', $this->payableCodes())
            ->when($period->to, fn (Builder $q, $to) => $q->whereDate('journal_entries.entry_date', '<=', $to->toDateString()))
            ->select('journal_entries.campus_id')
            ->selectRaw('SUM(journal_lines.credit - journal_lines.debit) as total')
            ->groupBy('journal_entries.campus_id')
            ->pluck('total', 'journal_entries.campus_id')
            ->map(fn ($value) => max((float) $value, 0.0))
            ->all();
    }

    /**
     * @return array<int, string>
     */
    private function payableCodes(): array
    {
        return array_values(array_filter([
            config('finance.accounts.vendor_payable'),
            config('finance.accounts.salary_payable'),
            config('finance.accounts.tax_payable'),
            config('finance.accounts.withholding_tax_payable'),
            config('finance.accounts.payroll_deductions_payable'),
        ]));
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

    private function enumValue(mixed $value): ?string
    {
        if ($value instanceof \BackedEnum) {
            return (string) $value->value;
        }

        if ($value === null || $value === '') {
            return null;
        }

        return (string) $value;
    }
}
