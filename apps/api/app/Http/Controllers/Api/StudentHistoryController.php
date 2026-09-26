<?php

namespace App\Http\Controllers\Api;

use App\Enums\ConductStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\StudentResource;
use App\Models\AcademicYear;
use App\Models\ConductRecord;
use App\Models\FeePayment;
use App\Models\FeeVoucher;
use App\Models\Student;
use App\Models\StudentAttendance;
use Illuminate\Http\JsonResponse;

class StudentHistoryController extends Controller
{
    public function show(Student $student): JsonResponse
    {
        $student->load([
            'guardians',
            'enrollments.academicYear',
            'enrollments.classRoom',
            'enrollments.section',
            'awards.scholarship',
        ]);

        return response()->json([
            'data' => [
                'student' => new StudentResource($student),
                'academic_history' => $student->enrollments
                    ->sortByDesc('academic_year_id')
                    ->values()
                    ->map(fn ($enrollment) => [
                        'academic_year_id' => $enrollment->academic_year_id,
                        'academic_year' => $enrollment->academicYear?->name,
                        'class_room' => $enrollment->classRoom?->name,
                        'section' => $enrollment->section?->name,
                        'roll_number' => $enrollment->roll_number,
                        'status' => $enrollment->status?->value ?? $enrollment->status,
                        'starts_on' => $enrollment->starts_on?->toDateString(),
                        'ends_on' => $enrollment->ends_on?->toDateString(),
                    ]),
                'attendance' => $this->attendance($student),
                'fees' => $this->fees($student),
                'conduct' => $this->conduct($student),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function attendance(Student $student): array
    {
        $rows = StudentAttendance::query()
            ->where('student_id', $student->id)
            ->selectRaw(
                'academic_year_id, count(*) as total,'
                ." sum(case when status in ('present','late') then 1 else 0 end) as present,"
                ." sum(case when status = 'late' then 1 else 0 end) as late,"
                ." sum(case when status = 'absent' then 1 else 0 end) as absent,"
                ." sum(case when status = 'leave' then 1 else 0 end) as `leave`,"
                ." sum(case when status = 'excused' then 1 else 0 end) as excused"
            )
            ->groupBy('academic_year_id')
            ->get();

        $yearNames = AcademicYear::query()
            ->whereIn('id', $rows->pluck('academic_year_id')->filter()->all())
            ->pluck('name', 'id');

        $byYear = $rows->map(fn ($row) => [
            'academic_year_id' => $row->academic_year_id,
            'academic_year' => $yearNames[$row->academic_year_id] ?? null,
            'total' => (int) $row->total,
            'present' => (int) $row->present,
            'late' => (int) $row->late,
            'absent' => (int) $row->absent,
            'leave' => (int) $row->leave,
            'excused' => (int) $row->excused,
            'present_percentage' => $this->percentage((int) $row->present, (int) $row->total),
        ])->sortByDesc('academic_year_id')->values();

        $totals = [
            'total' => (int) $byYear->sum('total'),
            'present' => (int) $byYear->sum('present'),
            'late' => (int) $byYear->sum('late'),
            'absent' => (int) $byYear->sum('absent'),
            'leave' => (int) $byYear->sum('leave'),
            'excused' => (int) $byYear->sum('excused'),
        ];

        $totals['present_percentage'] = $this->percentage($totals['present'], $totals['total']);

        return ['overall' => $totals, 'by_year' => $byYear];
    }

    /**
     * @return array<string, mixed>
     */
    private function fees(Student $student): array
    {
        $rows = FeeVoucher::query()
            ->where('student_id', $student->id)
            ->selectRaw('academic_year_id, sum(gross_amount) as gross, sum(discount_amount) as discount, sum(amount) as payable, sum(paid_amount) as paid')
            ->groupBy('academic_year_id')
            ->get();

        $yearNames = AcademicYear::query()
            ->whereIn('id', $rows->pluck('academic_year_id')->filter()->all())
            ->pluck('name', 'id');

        $byYear = $rows->map(function ($row) use ($yearNames) {
            $payable = (float) $row->payable;
            $paid = (float) $row->paid;

            return [
                'academic_year_id' => $row->academic_year_id,
                'academic_year' => $yearNames[$row->academic_year_id] ?? null,
                'gross' => round((float) $row->gross, 2),
                'discount' => round((float) $row->discount, 2),
                'payable' => round($payable, 2),
                'paid' => round($paid, 2),
                'balance' => round($payable - $paid, 2),
            ];
        })->sortByDesc('academic_year_id')->values();

        $totals = [
            'gross' => round((float) $byYear->sum('gross'), 2),
            'discount' => round((float) $byYear->sum('discount'), 2),
            'payable' => round((float) $byYear->sum('payable'), 2),
            'paid' => round((float) $byYear->sum('paid'), 2),
            'balance' => round((float) $byYear->sum('balance'), 2),
        ];

        $payments = FeePayment::query()
            ->where('student_id', $student->id)
            ->orderByDesc('payment_date')
            ->orderByDesc('id')
            ->limit(10)
            ->get()
            ->map(fn (FeePayment $payment) => [
                'id' => $payment->id,
                'receipt_no' => $payment->receipt_no,
                'payment_date' => $payment->payment_date?->toDateString(),
                'amount' => $payment->amount,
                'method' => $payment->method?->value,
                'status' => $payment->status?->value,
            ]);

        return [
            'totals' => $totals,
            'by_year' => $byYear,
            'recent_payments' => $payments,
            'scholarships' => $student->awards->map(fn ($award) => [
                'id' => $award->id,
                'scholarship' => $award->scholarship?->name,
                'discount_type' => $award->scholarship?->discount_type?->value,
                'value' => $award->value_override ?? $award->scholarship?->value,
                'awarded_on' => $award->awarded_on?->toDateString(),
                'status' => $award->status?->value,
            ])->values(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function conduct(Student $student): array
    {
        $rows = ConductRecord::query()
            ->where('student_id', $student->id)
            ->get();

        $byCategory = $rows->groupBy(fn (ConductRecord $record) => $record->category?->value ?? 'other')
            ->map(fn ($group, $category) => [
                'category' => $category,
                'count' => $group->count(),
            ])
            ->values();

        return [
            'totals' => [
                'total' => $rows->count(),
                'open' => $rows->where('status', ConductStatus::Open)->count(),
                'resolved' => $rows->where('status', ConductStatus::Resolved)->count(),
                'dismissed' => $rows->where('status', ConductStatus::Dismissed)->count(),
                'positive' => $rows->filter(fn (ConductRecord $record) => (bool) $record->category?->isPositive())->count(),
            ],
            'by_category' => $byCategory,
            'recent' => $rows->sortByDesc('occurred_on')->take(10)->values()->map(fn (ConductRecord $record) => [
                'id' => $record->id,
                'category' => $record->category?->value,
                'severity' => $record->severity?->value,
                'title' => $record->title,
                'occurred_on' => $record->occurred_on?->toDateString(),
                'status' => $record->status?->value,
            ]),
        ];
    }

    private function percentage(int $present, int $total): float
    {
        return $total > 0 ? round($present / $total * 100, 1) : 0.0;
    }
}
