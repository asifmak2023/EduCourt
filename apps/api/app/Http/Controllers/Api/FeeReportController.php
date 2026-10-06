<?php

namespace App\Http\Controllers\Api;

use App\Enums\BillingKind;
use App\Enums\PaymentStatus;
use App\Enums\VoucherStatus;
use App\Http\Controllers\Controller;
use App\Models\FeeCharge;
use App\Models\FeePayment;
use App\Models\FeeReceipt;
use App\Models\FeeVoucher;
use App\Models\Student;
use App\Models\StudentEnrollment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class FeeReportController extends Controller
{
    public function defaulters(Request $request): JsonResponse
    {
        $asOf = $request->filled('as_of') ? Carbon::parse($request->input('as_of')) : Carbon::today();
        $overdueOnly = $request->boolean('overdue_only', true);
        $minBalance = (float) $request->input('min_balance', 0);

        $academicYearId = $request->filled('academic_year_id') ? $request->integer('academic_year_id') : null;

        $vouchers = FeeVoucher::query()
            ->with(['student.enrollments.classRoom', 'student.enrollments.section'])
            ->whereIn('status', [VoucherStatus::Unpaid->value, VoucherStatus::Partial->value])
            ->when($academicYearId !== null, fn ($q) => $q->where('academic_year_id', $academicYearId))
            ->when($request->filled('class_room_id'), fn ($q) => $q->whereHas('student.enrollments', fn ($e) => $e
                ->where('class_room_id', $request->integer('class_room_id'))
                ->when($academicYearId !== null, fn ($inner) => $inner->where('academic_year_id', $academicYearId))))
            ->when($overdueOnly, fn ($q) => $q->whereDate('due_date', '<', $asOf->toDateString()))
            ->orderBy('due_date')
            ->get();

        $buckets = [
            'current' => 0.0,
            'days_1_30' => 0.0,
            'days_31_60' => 0.0,
            'days_61_90' => 0.0,
            'days_over_90' => 0.0,
        ];

        $grouped = [];

        foreach ($vouchers as $voucher) {
            $balance = round((float) $voucher->amount - (float) $voucher->paid_amount, 2);

            if ($balance <= 0 || $balance < $minBalance) {
                continue;
            }

            $daysOverdue = $voucher->due_date === null
                ? 0
                : (int) $voucher->due_date->startOfDay()->diffInDays($asOf->copy()->startOfDay(), false);
            $daysOverdue = max($daysOverdue, 0);

            $bucket = $this->bucketFor($daysOverdue);
            $buckets[$bucket] += $balance;

            $enrollment = $this->enrollmentFor($voucher->student?->enrollments ?? collect(), $voucher->academic_year_id);
            $key = $voucher->student_id.'-'.($enrollment?->class_room_id ?? 0);

            if (! isset($grouped[$key])) {
                $grouped[$key] = [
                    'student_id' => $voucher->student_id,
                    'student' => $voucher->student?->full_name,
                    'admission_no' => $voucher->student?->admission_no,
                    'class_room_id' => $enrollment?->class_room_id,
                    'class' => $enrollment?->classRoom?->name,
                    'section' => $enrollment?->section?->name,
                    'vouchers' => 0,
                    'outstanding' => 0.0,
                    'oldest_due_date' => $voucher->due_date?->toDateString(),
                    'max_days_overdue' => 0,
                ];
            }

            $grouped[$key]['vouchers']++;
            $grouped[$key]['outstanding'] += $balance;

            if ($daysOverdue > $grouped[$key]['max_days_overdue']) {
                $grouped[$key]['max_days_overdue'] = $daysOverdue;
            }

            if ($grouped[$key]['oldest_due_date'] === null || $voucher->due_date?->toDateString() < $grouped[$key]['oldest_due_date']) {
                $grouped[$key]['oldest_due_date'] = $voucher->due_date?->toDateString();
            }
        }

        $rows = collect($grouped)
            ->map(function (array $row) {
                $row['outstanding'] = $this->money($row['outstanding']);
                $row['bucket'] = $this->bucketFor($row['max_days_overdue']);

                return $row;
            })
            ->sortByDesc(fn (array $row) => (float) $row['outstanding'])
            ->values();

        return response()->json([
            'as_of' => $asOf->toDateString(),
            'summary' => [
                'students' => $rows->count(),
                'vouchers' => $rows->sum('vouchers'),
                'outstanding' => $this->money($rows->sum(fn (array $row) => (float) $row['outstanding'])),
                'buckets' => array_map(fn (float $amount) => $this->money($amount), $buckets),
            ],
            'data' => $rows,
        ]);
    }

    public function studentStatement(Request $request, Student $student): JsonResponse
    {
        $from = $request->filled('from') ? Carbon::parse($request->input('from'))->startOfDay() : null;
        $to = $request->filled('to') ? Carbon::parse($request->input('to'))->endOfDay() : null;
        $academicYearId = $request->filled('academic_year_id') ? $request->integer('academic_year_id') : null;

        $vouchers = FeeVoucher::query()
            ->where('student_id', $student->id)
            ->whereIn('status', [VoucherStatus::Unpaid->value, VoucherStatus::Partial->value, VoucherStatus::Paid->value])
            ->when($academicYearId !== null, fn ($q) => $q->where('academic_year_id', $academicYearId))
            ->orderBy('due_date')
            ->orderBy('id')
            ->get();

        $payments = FeePayment::query()
            ->where('student_id', $student->id)
            ->where('status', PaymentStatus::Posted->value)
            ->orderBy('payment_date')
            ->orderBy('id')
            ->get();

        $opening = 0.0;

        $movements = collect();

        foreach ($vouchers as $voucher) {
            $date = $voucher->due_date?->copy();

            if ($date !== null && $from !== null && $date->lt($from)) {
                $opening += (float) $voucher->amount;

                continue;
            }

            if ($date !== null && $to !== null && $date->gt($to)) {
                continue;
            }

            $movements->push([
                'sort_date' => $date?->toDateString(),
                'sort_id' => $voucher->id,
                'type' => 'voucher',
                'reference' => $voucher->voucher_no,
                'description' => "Fee voucher (installment {$voucher->sequence})",
                'debit' => (float) $voucher->amount,
                'credit' => 0.0,
            ]);
        }

        foreach ($payments as $payment) {
            $date = $payment->payment_date?->copy();

            if ($date !== null && $from !== null && $date->lt($from)) {
                $opening -= (float) $payment->amount;

                continue;
            }

            if ($date !== null && $to !== null && $date->gt($to)) {
                continue;
            }

            $movements->push([
                'sort_date' => $date?->toDateString(),
                'sort_id' => $payment->id,
                'type' => 'payment',
                'reference' => $payment->receipt_no,
                'description' => 'Fee receipt ('.($payment->method?->label() ?? '').')',
                'debit' => 0.0,
                'credit' => (float) $payment->amount,
            ]);
        }

        $balance = $opening;
        $billed = 0.0;
        $paid = 0.0;

        $entries = $movements
            ->sortBy([['sort_date', 'asc'], ['type', 'asc'], ['sort_id', 'asc']])
            ->values()
            ->map(function (array $row) use (&$balance, &$billed, &$paid) {
                $balance += $row['debit'] - $row['credit'];
                $billed += $row['debit'];
                $paid += $row['credit'];

                return [
                    'date' => $row['sort_date'],
                    'type' => $row['type'],
                    'reference' => $row['reference'],
                    'description' => $row['description'],
                    'debit' => $this->money($row['debit']),
                    'credit' => $this->money($row['credit']),
                    'balance' => $this->money($balance),
                ];
            });

        return response()->json([
            'student' => [
                'id' => $student->id,
                'admission_no' => $student->admission_no,
                'name' => $student->full_name,
            ],
            'from' => $from?->toDateString(),
            'to' => $to?->toDateString(),
            'opening_balance' => $this->money($opening),
            'data' => $entries,
            'totals' => [
                'billed' => $this->money($billed),
                'paid' => $this->money($paid),
                'outstanding' => $this->money($balance),
            ],
        ]);
    }

    public function classSummary(Request $request): JsonResponse
    {
        $academicYearId = $request->filled('academic_year_id') ? $request->integer('academic_year_id') : null;

        $vouchers = FeeVoucher::query()
            ->with(['student.enrollments.classRoom'])
            ->where('status', '!=', VoucherStatus::Void->value)
            ->when($academicYearId !== null, fn ($q) => $q->where('academic_year_id', $academicYearId))
            ->when($request->filled('class_room_id'), fn ($q) => $q->whereHas('student.enrollments', fn ($e) => $e
                ->where('class_room_id', $request->integer('class_room_id'))
                ->when($academicYearId !== null, fn ($inner) => $inner->where('academic_year_id', $academicYearId))))
            ->get();

        $classes = [];

        foreach ($vouchers as $voucher) {
            $enrollment = $this->enrollmentFor($voucher->student?->enrollments ?? collect(), $voucher->academic_year_id);
            $classId = $enrollment?->class_room_id ?? 0;

            if (! isset($classes[$classId])) {
                $classes[$classId] = [
                    'class_room_id' => $enrollment?->class_room_id,
                    'class' => $enrollment?->classRoom?->name,
                    'students' => [],
                    'vouchers' => 0,
                    'billed' => 0.0,
                    'collected' => 0.0,
                ];
            }

            $classes[$classId]['students'][$voucher->student_id] = true;
            $classes[$classId]['vouchers']++;
            $classes[$classId]['billed'] += (float) $voucher->amount;
            $classes[$classId]['collected'] += (float) $voucher->paid_amount;
        }

        $rows = collect($classes)
            ->map(function (array $row) {
                $billed = round($row['billed'], 2);
                $collected = round($row['collected'], 2);

                return [
                    'class_room_id' => $row['class_room_id'],
                    'class' => $row['class'],
                    'students' => count($row['students']),
                    'vouchers' => $row['vouchers'],
                    'billed' => $this->money($billed),
                    'collected' => $this->money($collected),
                    'outstanding' => $this->money($billed - $collected),
                    'collection_rate' => $billed > 0 ? round($collected / $billed * 100, 2) : 0.0,
                ];
            })
            ->sortBy('class')
            ->values();

        return response()->json([
            'summary' => [
                'classes' => $rows->count(),
                'students' => $vouchers->pluck('student_id')->unique()->count(),
                'billed' => $this->money($rows->sum(fn (array $row) => (float) $row['billed'])),
                'collected' => $this->money($rows->sum(fn (array $row) => (float) $row['collected'])),
                'outstanding' => $this->money($rows->sum(fn (array $row) => (float) $row['outstanding'])),
            ],
            'data' => $rows,
        ]);
    }

    public function collection(Request $request): JsonResponse
    {
        $from = $request->filled('from') ? Carbon::parse($request->input('from')) : Carbon::today()->startOfMonth();
        $to = $request->filled('to') ? Carbon::parse($request->input('to')) : Carbon::today();

        $payments = FeePayment::query()
            ->where('status', PaymentStatus::Posted->value)
            ->whereDate('payment_date', '>=', $from->toDateString())
            ->whereDate('payment_date', '<=', $to->toDateString())
            ->get();

        $byMethod = $payments
            ->groupBy(fn (FeePayment $payment) => $payment->method?->value ?? 'other')
            ->map(fn (Collection $group, string $method) => [
                'method' => $method,
                'count' => $group->count(),
                'total' => $this->money($group->sum(fn (FeePayment $payment) => (float) $payment->amount)),
            ])
            ->values();

        $byDay = $payments
            ->groupBy(fn (FeePayment $payment) => $payment->payment_date?->toDateString())
            ->map(fn (Collection $group, string $date) => [
                'date' => $date,
                'count' => $group->count(),
                'total' => $this->money($group->sum(fn (FeePayment $payment) => (float) $payment->amount)),
            ])
            ->sortKeys()
            ->values();

        return response()->json([
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'total' => $this->money($payments->sum(fn (FeePayment $payment) => (float) $payment->amount)),
            'count' => $payments->count(),
            'by_method' => $byMethod,
            'by_day' => $byDay,
        ]);
    }

    /**
     * Accounts receivable: charge-level listing with filters and totals.
     */
    public function ar(Request $request): JsonResponse
    {
        $asOf = $request->filled('as_of') ? Carbon::parse($request->input('as_of')) : Carbon::today();
        $perPage = min(max($request->integer('per_page', 50), 1), 500);

        $base = $this->arBase($request);

        $totals = (clone $base)
            ->where('status', '!=', VoucherStatus::Void->value)
            ->selectRaw('COUNT(*) as charges, SUM(amount) as billed, SUM(paid_amount) as collected')
            ->first();

        $this->applyArStatus($base, $request->string('status')->toString(), $asOf);

        $charges = $base
            ->with([
                'student:id,admission_no,first_name,last_name',
                'classRoom:id,name', 'section:id,name', 'campus:id,name',
                'enrollment:id,student_id,roll_number',
            ])
            ->orderBy('due_date')
            ->orderBy('id')
            ->paginate($perPage);

        $rows = $charges->getCollection()->map(function (FeeCharge $charge) use ($asOf) {
            $billed = round((float) $charge->amount, 2);
            $paid = round((float) $charge->paid_amount, 2);
            $outstanding = max(round($billed - $paid, 2), 0.0);

            $daysOverdue = $charge->due_date === null
                ? 0
                : (int) $charge->due_date->startOfDay()->diffInDays($asOf->copy()->startOfDay(), false);
            $daysOverdue = max($daysOverdue, 0);

            return [
                'id' => $charge->id,
                'campus' => $charge->campus?->name,
                'student_id' => $charge->student_id,
                'student_name' => $charge->student?->full_name,
                'admission_no' => $charge->student?->admission_no,
                'roll_number' => $charge->enrollment?->roll_number,
                'class' => $charge->classRoom?->name,
                'section' => $charge->section?->name,
                'fee_type' => $charge->billing_kind?->label(),
                'billing_kind' => $charge->billing_kind?->value,
                'exam_term' => $charge->exam_term?->value,
                'period' => $this->periodLabel($charge),
                'voucher_no' => $charge->voucher_no,
                'due_date' => $charge->due_date?->toDateString(),
                'amount_due' => $this->money($billed),
                'amount_paid' => $this->money($paid),
                'outstanding' => $this->money($outstanding),
                'days_overdue' => $daysOverdue,
                'bucket' => $this->bucketFor($daysOverdue),
                'status' => $charge->status?->value,
                'status_label' => $charge->status?->label(),
            ];
        });

        $billed = (float) ($totals->billed ?? 0);
        $collected = (float) ($totals->collected ?? 0);

        return response()->json([
            'as_of' => $asOf->toDateString(),
            'summary' => [
                'charges' => (int) ($totals->charges ?? 0),
                'billed' => $this->money($billed),
                'collected' => $this->money($collected),
                'outstanding' => $this->money(max($billed - $collected, 0)),
            ],
            'meta' => [
                'current_page' => $charges->currentPage(),
                'last_page' => $charges->lastPage(),
                'per_page' => $charges->perPage(),
                'total' => $charges->total(),
            ],
            'data' => $rows,
        ]);
    }

    /**
     * Accounts receivable dashboard metrics.
     */
    public function arSummary(Request $request): JsonResponse
    {
        $asOf = $request->filled('as_of') ? Carbon::parse($request->input('as_of')) : Carbon::today();
        $asOfStr = $asOf->toDateString();

        $base = $this->arBase($request)->where('status', '!=', VoucherStatus::Void->value);

        $totals = (clone $base)
            ->selectRaw('SUM(amount) as billed, SUM(paid_amount) as collected')
            ->first();

        $billed = (float) ($totals->billed ?? 0);
        $collected = (float) ($totals->collected ?? 0);

        $d30 = $asOf->copy()->subDays(30)->toDateString();
        $d60 = $asOf->copy()->subDays(60)->toDateString();
        $d90 = $asOf->copy()->subDays(90)->toDateString();

        $aging = (clone $base)
            ->whereIn('status', [VoucherStatus::Unpaid->value, VoucherStatus::Partial->value])
            ->selectRaw(
                'SUM(CASE WHEN due_date IS NULL OR due_date >= ? THEN amount - paid_amount ELSE 0 END) as current, '
                .'SUM(CASE WHEN due_date < ? AND due_date >= ? THEN amount - paid_amount ELSE 0 END) as days_1_30, '
                .'SUM(CASE WHEN due_date < ? AND due_date >= ? THEN amount - paid_amount ELSE 0 END) as days_31_60, '
                .'SUM(CASE WHEN due_date < ? AND due_date >= ? THEN amount - paid_amount ELSE 0 END) as days_61_90, '
                .'SUM(CASE WHEN due_date < ? THEN amount - paid_amount ELSE 0 END) as days_over_90',
                [$asOfStr, $asOfStr, $d30, $d30, $d60, $d60, $d90, $d90]
            )
            ->first();

        $counts = (clone $base)
            ->selectRaw(
                'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as unpaid, '
                .'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as partial, '
                .'SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as paid',
                [VoucherStatus::Unpaid->value, VoucherStatus::Partial->value, VoucherStatus::Paid->value]
            )
            ->first();

        $monthStart = Carbon::today()->startOfMonth()->toDateString();
        $today = Carbon::today()->toDateString();

        $collection = FeeReceipt::query()
            ->where('status', PaymentStatus::Posted->value)
            ->selectRaw(
                'SUM(CASE WHEN payment_date = ? THEN amount ELSE 0 END) as today, '
                .'SUM(CASE WHEN payment_date >= ? AND payment_date <= ? THEN amount ELSE 0 END) as this_month',
                [$today, $monthStart, $today]
            )
            ->first();

        return response()->json([
            'as_of' => $asOfStr,
            'totals' => [
                'billed' => $this->money($billed),
                'collected' => $this->money($collected),
                'outstanding' => $this->money(max($billed - $collected, 0)),
            ],
            'collection' => [
                'today' => $this->money((float) ($collection->today ?? 0)),
                'this_month' => $this->money((float) ($collection->this_month ?? 0)),
            ],
            'aging' => [
                'current' => $this->money((float) ($aging->current ?? 0)),
                'days_1_30' => $this->money((float) ($aging->days_1_30 ?? 0)),
                'days_31_60' => $this->money((float) ($aging->days_31_60 ?? 0)),
                'days_61_90' => $this->money((float) ($aging->days_61_90 ?? 0)),
                'days_over_90' => $this->money((float) ($aging->days_over_90 ?? 0)),
            ],
            'counts' => [
                'unpaid' => (int) ($counts->unpaid ?? 0),
                'partial' => (int) ($counts->partial ?? 0),
                'paid' => (int) ($counts->paid ?? 0),
            ],
        ]);
    }

    private function arBase(Request $request): Builder
    {
        $search = trim($request->string('search')->toString());

        return FeeCharge::query()
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->when($request->filled('class_room_id'), fn ($q) => $q->where('class_room_id', $request->integer('class_room_id')))
            ->when($request->filled('section_id'), fn ($q) => $q->where('section_id', $request->integer('section_id')))
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('billing_kind'), fn ($q) => $q->where('billing_kind', $request->string('billing_kind')->toString()))
            ->when($request->filled('exam_term'), fn ($q) => $q->where('exam_term', $request->string('exam_term')->toString()))
            ->when($request->filled('due_from'), fn ($q) => $q->whereDate('due_date', '>=', $request->date('due_from')))
            ->when($request->filled('due_to'), fn ($q) => $q->whereDate('due_date', '<=', $request->date('due_to')))
            ->when($search !== '', fn ($q) => $q->where(function ($inner) use ($search) {
                $inner->where('voucher_no', 'like', "%{$search}%")
                    ->orWhereHas('student', function ($s) use ($search) {
                        $s->where('admission_no', 'like', "%{$search}%")
                            ->orWhere('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhereRaw("CONCAT(first_name, ' ', IFNULL(last_name, '')) LIKE ?", ["%{$search}%"]);
                    });
            }));
    }

    private function applyArStatus(Builder $query, string $status, Carbon $asOf): void
    {
        if ($status === 'outstanding') {
            $query->whereIn('status', [VoucherStatus::Unpaid->value, VoucherStatus::Partial->value]);
        } elseif ($status === 'unpaid') {
            $query->where('status', VoucherStatus::Unpaid->value);
        } elseif ($status === 'partial') {
            $query->where('status', VoucherStatus::Partial->value);
        } elseif ($status === 'paid') {
            $query->where('status', VoucherStatus::Paid->value);
        } elseif ($status === 'overdue') {
            $query->whereIn('status', [VoucherStatus::Unpaid->value, VoucherStatus::Partial->value])
                ->whereDate('due_date', '<', $asOf->toDateString());
        }
    }

    private function periodLabel(FeeCharge $charge): ?string
    {
        if ($charge->billing_kind === BillingKind::Monthly && $charge->period_month !== null) {
            return Carbon::create($charge->period_year, $charge->period_month, 1)->format('M Y');
        }

        if ($charge->billing_kind === BillingKind::Exam && $charge->exam_term !== null) {
            return $charge->exam_term->label();
        }

        return $charge->title;
    }

    /**
     * @param  Collection<int, StudentEnrollment>  $enrollments
     */
    private function enrollmentFor(Collection $enrollments, ?int $academicYearId): ?StudentEnrollment
    {
        return $enrollments->firstWhere('academic_year_id', $academicYearId)
            ?? $enrollments->first();
    }

    private function bucketFor(int $daysOverdue): string
    {
        return match (true) {
            $daysOverdue <= 0 => 'current',
            $daysOverdue <= 30 => 'days_1_30',
            $daysOverdue <= 60 => 'days_31_60',
            $daysOverdue <= 90 => 'days_61_90',
            default => 'days_over_90',
        };
    }

    private function money(float $amount): string
    {
        return number_format($amount, 2, '.', '');
    }
}
