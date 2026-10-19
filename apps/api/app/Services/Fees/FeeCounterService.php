<?php

namespace App\Services\Fees;

use App\Enums\BillingKind;
use App\Enums\VoucherStatus;
use App\Models\FeeCharge;
use App\Models\FeeChargeLine;
use App\Models\FeePayment;
use App\Models\FeeReceipt;
use App\Models\FeeReceiptAllocation;
use App\Models\FeeStructure;
use App\Models\FeeStructureItem;
use App\Models\FeeVoucher;
use App\Models\Student;
use App\Models\StudentEnrollment;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class FeeCounterService
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function searchStudents(array $filters, int $perPage = 25): LengthAwarePaginator
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $academicYearId = isset($filters['academic_year_id']) ? (int) $filters['academic_year_id'] : null;
        $classRoomId = isset($filters['class_room_id']) ? (int) $filters['class_room_id'] : null;
        $sectionId = isset($filters['section_id']) ? (int) $filters['section_id'] : null;

        $students = Student::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('admission_no', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhereRaw("CONCAT(first_name, ' ', IFNULL(last_name, '')) LIKE ?", ["%{$search}%"])
                        ->orWhereHas('guardians', fn ($g) => $g
                            ->where('phone', 'like', "%{$search}%")
                            ->orWhere('alternate_phone', 'like', "%{$search}%")
                            ->orWhere('national_id', 'like', "%{$search}%"))
                        ->orWhereHas('enrollments', fn ($e) => $e->where('roll_number', 'like', "%{$search}%"));
                });
            })
            ->when($academicYearId !== null || $classRoomId !== null || $sectionId !== null, fn ($q) => $q
                ->whereHas('enrollments', function ($e) use ($academicYearId, $classRoomId, $sectionId) {
                    $e->when($academicYearId !== null, fn ($inner) => $inner->where('academic_year_id', $academicYearId))
                        ->when($classRoomId !== null, fn ($inner) => $inner->where('class_room_id', $classRoomId))
                        ->when($sectionId !== null, fn ($inner) => $inner->where('section_id', $sectionId));
                }))
            ->where('status', 'active')
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->paginate($perPage);

        $ids = $students->pluck('id');

        $enrollments = StudentEnrollment::query()
            ->with(['classRoom:id,name', 'section:id,name'])
            ->whereIn('student_id', $ids)
            ->when($academicYearId !== null, fn ($q) => $q->where('academic_year_id', $academicYearId))
            ->orderByDesc('id')
            ->get()
            ->unique('student_id')
            ->keyBy('student_id');

        $balances = FeeCharge::query()
            ->whereIn('student_id', $ids)
            ->whereIn('status', [VoucherStatus::Unpaid->value, VoucherStatus::Partial->value])
            ->when($academicYearId !== null, fn ($q) => $q->where('academic_year_id', $academicYearId))
            ->selectRaw('student_id, SUM(amount - paid_amount) as balance')
            ->groupBy('student_id')
            ->pluck('balance', 'student_id');

        $students->getCollection()->transform(function (Student $student) use ($enrollments, $balances) {
            $enrollment = $enrollments->get($student->id);

            return [
                'id' => $student->id,
                'admission_no' => $student->admission_no,
                'roll_number' => $enrollment?->roll_number,
                'full_name' => $student->full_name,
                'photo_url' => $student->photo_path
                    ? Storage::disk('public')->url($student->photo_path)
                    : null,
                'class_room_id' => $enrollment?->class_room_id,
                'class' => $enrollment?->classRoom?->name,
                'section_id' => $enrollment?->section_id,
                'section' => $enrollment?->section?->name,
                'academic_year_id' => $enrollment?->academic_year_id,
                'outstanding' => number_format((float) ($balances[$student->id] ?? 0), 2, '.', ''),
            ];
        });

        return $students;
    }

    /**
     * @return array<string, mixed>
     */
    public function dues(Student $student, ?int $academicYearId = null): array
    {
        $enrollment = $student->enrollments()
            ->with(['classRoom:id,name', 'section:id,name', 'academicYear:id,name,starts_on,ends_on'])
            ->when($academicYearId !== null, fn ($q) => $q->where('academic_year_id', $academicYearId))
            ->orderByDesc('id')
            ->first();

        if ($enrollment === null) {
            throw ValidationException::withMessages([
                'student' => ['This student has no enrollment for the selected academic year.'],
            ]);
        }

        $charges = FeeCharge::query()
            ->with('lines.feeHead')
            ->where('student_id', $student->id)
            ->where('academic_year_id', $enrollment->academic_year_id)
            ->orderBy('due_date')
            ->get();

        $open = $charges
            ->whereIn('status', [VoucherStatus::Unpaid->value, VoucherStatus::Partial->value])
            ->values();

        $structure = FeeStructure::query()
            ->with(['items.feeHead'])
            ->where('academic_year_id', $enrollment->academic_year_id)
            ->where('class_room_id', $enrollment->class_room_id)
            ->where('is_active', true)
            ->first();

        $backfilledMonths = $charges
            ->where('billing_kind', BillingKind::Monthly)
            ->where('status', '!=', VoucherStatus::Void->value)
            ->map(fn (FeeCharge $charge) => $charge->period_year.'-'.$charge->period_month)
            ->all();

        return [
            'student' => [
                'id' => $student->id,
                'admission_no' => $student->admission_no,
                'roll_number' => $enrollment->roll_number,
                'full_name' => $student->full_name,
                'photo_url' => $student->photo_path
                    ? Storage::disk('public')->url($student->photo_path)
                    : null,
                'campus_id' => $student->campus_id,
                'academic_year_id' => $enrollment->academic_year_id,
                'class_room_id' => $enrollment->class_room_id,
                'class' => $enrollment->classRoom?->name,
                'section_id' => $enrollment->section_id,
                'section' => $enrollment->section?->name,
                'guardian_phone' => $student->guardians()->value('phone'),
            ],
            'structure' => $structure ? [
                'id' => $structure->id,
                'monthly_amount' => number_format($this->monthlyTotal($structure), 2, '.', ''),
                'monthly_items' => $structure->items
                    ->where('billing_kind', BillingKind::Monthly)
                    ->where('is_active', true)
                    ->map(fn (FeeStructureItem $item) => [
                        'id' => $item->id,
                        'name' => $item->name,
                        'amount' => $item->amount,
                        'fee_head_id' => $item->fee_head_id,
                    ])->values(),
                'exam_terms' => $structure->items
                    ->where('billing_kind', BillingKind::Exam)
                    ->where('is_active', true)
                    ->map(fn (FeeStructureItem $item) => [
                        'id' => $item->id,
                        'name' => $item->name,
                        'exam_term' => $item->exam_term?->value,
                        'amount' => $item->amount,
                        'fee_head_id' => $item->fee_head_id,
                    ])->values(),
                'other_items' => $structure->items
                    ->whereIn('billing_kind', [BillingKind::OneTime, BillingKind::Other])
                    ->where('is_active', true)
                    ->map(fn (FeeStructureItem $item) => [
                        'id' => $item->id,
                        'name' => $item->name,
                        'amount' => $item->amount,
                        'fee_head_id' => $item->fee_head_id,
                    ])->values(),
            ] : null,
            'open_charges' => $open->map(fn (FeeCharge $charge) => [
                'id' => $charge->id,
                'voucher_no' => $charge->voucher_no,
                'billing_kind' => $charge->billing_kind?->value,
                'exam_term' => $charge->exam_term?->value,
                'period_year' => $charge->period_year,
                'period_month' => $charge->period_month,
                'title' => $charge->title,
                'amount' => $charge->amount,
                'paid_amount' => $charge->paid_amount,
                'balance' => number_format($charge->balance(), 2, '.', ''),
                'due_date' => $charge->due_date?->toDateString(),
                'status' => $charge->status?->value,
            ])->values(),
            'pending_months' => $this->pendingMonths($enrollment, $structure, $backfilledMonths),
            'totals' => [
                'outstanding' => number_format($open->sum(fn (FeeCharge $c) => $c->balance()), 2, '.', ''),
                'billed' => number_format($charges->sum('amount'), 2, '.', ''),
                'paid' => number_format($charges->sum('paid_amount'), 2, '.', ''),
            ],
        ];
    }

    /**
     * Generate a monthly voucher for every active student in a class/section.
     *
     * @return array<string, mixed>
     */
    public function generateMonthlyBulk(
        int $academicYearId,
        int $classRoomId,
        ?int $sectionId,
        int $periodYear,
        int $periodMonth,
        ?string $dueDate,
        int $userId,
    ): array {
        $enrollments = StudentEnrollment::query()
            ->with(['student', 'classRoom:id,name', 'section:id,name'])
            ->where('academic_year_id', $academicYearId)
            ->where('class_room_id', $classRoomId)
            ->when($sectionId !== null, fn ($q) => $q->where('section_id', $sectionId))
            ->whereHas('student', fn ($q) => $q->where('status', 'active'))
            ->orderByDesc('id')
            ->get()
            ->unique('student_id');

        $structure = FeeStructure::query()
            ->with('items')
            ->where('academic_year_id', $academicYearId)
            ->where('class_room_id', $classRoomId)
            ->where('is_active', true)
            ->first();

        $monthlyItems = $structure
            ? $structure->items
                ->where('billing_kind', BillingKind::Monthly)
                ->where('is_active', true)
                ->values()
            : collect();

        $monthlyTotal = $monthlyItems->sum('amount');

        $created = 0;
        $skipped = 0;
        $errors = 0;
        $results = [];

        foreach ($enrollments as $enrollment) {
            $student = $enrollment->student;

            if ($student === null) {
                continue;
            }

            $base = [
                'student_id' => $student->id,
                'student_name' => $student->full_name,
                'admission_no' => $student->admission_no,
            ];

            if ($structure === null || $monthlyTotal <= 0) {
                $skipped++;
                $results[] = $base + ['status' => 'skipped', 'message' => 'No monthly fee structure.'];

                continue;
            }

            try {
                // Never regenerate or void an existing month. If a voucher already
                // exists for this student + month, return it instead of creating a
                // duplicate invoice.
                $item = [
                    'billing_kind' => BillingKind::Monthly->value,
                    'period_year' => $periodYear,
                    'period_month' => $periodMonth,
                    'title' => 'Monthly Fee',
                    'amount' => $monthlyTotal,
                    'source' => 'structure',
                    'due_date' => $dueDate ?: now()->toDateString(),
                    'lines' => $monthlyItems->map(fn (FeeStructureItem $line) => [
                        'fee_head_id' => $line->fee_head_id,
                        'description' => $line->name,
                        'amount' => $line->amount,
                    ])->all(),
                ];

                $result = $this->generate($student, ['academic_year_id' => $academicYearId], [$item], null, $userId);
                $charge = collect($result['charges'])->first();

                if ($charge !== null && $charge->wasRecentlyCreated && $charge->source !== 'legacy') {
                    $created++;
                    $results[] = $base + ['status' => 'created', 'voucher_no' => $charge->voucher_no, 'charge_id' => $charge->id];
                } else {
                    // Voucher already exists for this month — surface it so the
                    // caller can print it instead of creating a duplicate.
                    $skipped++;
                    $results[] = $base + [
                        'status' => 'existing',
                        'message' => 'Already billed for this month.',
                        'voucher_no' => $charge?->voucher_no,
                        'charge_id' => $charge?->id,
                    ];
                }
            } catch (\Throwable $e) {
                $errors++;
                $results[] = $base + ['status' => 'error', 'message' => $e->getMessage()];
            }
        }

        return [
            'created' => $created,
            'skipped' => $skipped,
            'errors' => $errors,
            'results' => $results,
            'missing_structure' => $structure === null || $monthlyTotal <= 0,
            'fee_structure_id' => $structure?->id,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @param  array<string, mixed>|null  $payment
     * @return array<string, mixed>
     */
    public function generate(Student $student, array $data, array $items, ?array $payment, int $userId): array
    {
        $academicYearId = (int) $data['academic_year_id'];

        $enrollment = $student->enrollments()
            ->where('academic_year_id', $academicYearId)
            ->orderByDesc('id')
            ->first();

        if ($enrollment === null) {
            throw ValidationException::withMessages([
                'student' => ['This student has no enrollment for the selected academic year.'],
            ]);
        }

        return DB::transaction(function () use ($student, $data, $items, $payment, $userId, $enrollment) {
            $discount = round((float) ($data['discount_amount'] ?? 0), 2);
            $gross = round(collect($items)->sum(fn (array $item) => (float) $item['amount']), 2);

            if ($discount > $gross) {
                throw ValidationException::withMessages([
                    'discount_amount' => ['Discount cannot exceed the total amount.'],
                ]);
            }

            $remainingDiscount = $discount;
            $created = collect();

            foreach ($items as $index => $item) {
                $itemAmount = round((float) $item['amount'], 2);
                $isLast = $index === array_key_last($items);
                $itemDiscount = $isLast
                    ? $remainingDiscount
                    : round($gross > 0 ? $discount * ($itemAmount / $gross) : 0, 2);
                $remainingDiscount = round($remainingDiscount - $itemDiscount, 2);

                $charge = $this->persistCharge($student, $enrollment, $item, [
                    'amount' => round($itemAmount - $itemDiscount, 2),
                    'discount_amount' => $itemDiscount,
                    'discount_note' => $data['discount_note'] ?? null,
                ], $userId);

                $created->push($charge);
            }

            $receipt = null;
            $allocations = collect();

            $paymentAmount = round((float) ($payment['amount'] ?? 0), 2);

            if ($payment !== null && $paymentAmount > 0) {
                $receipt = FeeReceipt::create([
                    'institution_id' => $student->institution_id,
                    'campus_id' => $student->campus_id,
                    'student_id' => $student->id,
                    'receipt_no' => $this->nextReceiptNo($student->campus_id),
                    'payment_date' => $payment['payment_date'] ?? now()->toDateString(),
                    'amount' => $paymentAmount,
                    'method' => $payment['method'] ?? 'cash',
                    'reference' => $payment['reference'] ?? null,
                    'notes' => $payment['notes'] ?? null,
                    'status' => 'posted',
                    'created_by' => $userId,
                ]);

                $allocations = $this->allocatePayment($receipt, $paymentAmount, $created, $student->id, $academicYearId);
            }

            $newCount = $created->filter(fn (FeeCharge $charge) => $charge->wasRecentlyCreated)->count();

            return [
                'charges' => $created,
                'created' => $newCount,
                'existing' => $created->count() - $newCount,
                'receipt' => $receipt,
                'allocations' => $allocations,
            ];
        });
    }

    /**
     * Record a payment against a student's open fee charges and allocate it
     * oldest-first (or to a specific pinned charge first).
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function receivePayment(Student $student, array $data, int $userId): array
    {
        $amount = round((float) $data['amount'], 2);
        $academicYearId = isset($data['academic_year_id']) ? (int) $data['academic_year_id'] : null;
        $pinnedId = isset($data['fee_charge_id']) ? (int) $data['fee_charge_id'] : null;

        return DB::transaction(function () use ($student, $data, $userId, $amount, $academicYearId, $pinnedId) {
            $query = FeeCharge::query()
                ->where('student_id', $student->id)
                ->whereIn('status', [VoucherStatus::Unpaid->value, VoucherStatus::Partial->value]);

            if ($academicYearId !== null) {
                $query->where('academic_year_id', $academicYearId);
            }

            if ($pinnedId !== null) {
                $query->where('id', $pinnedId);
            }

            $targets = $query->orderBy('due_date')->orderBy('id')->get();

            if ($targets->isEmpty()) {
                throw ValidationException::withMessages([
                    'amount' => ['There is no outstanding balance to receive a payment against.'],
                ]);
            }

            $outstanding = round($targets->sum(fn (FeeCharge $charge) => $charge->balance()), 2);

            if ($amount > $outstanding + 0.005) {
                throw ValidationException::withMessages([
                    'amount' => ["The amount exceeds the outstanding balance of {$outstanding}."],
                ]);
            }

            $receipt = FeeReceipt::create([
                'institution_id' => $student->institution_id,
                'campus_id' => $student->campus_id,
                'student_id' => $student->id,
                'receipt_no' => $this->nextReceiptNo($student->campus_id),
                'payment_date' => $data['payment_date'] ?? now()->toDateString(),
                'amount' => $amount,
                'method' => $data['method'] ?? 'cash',
                'reference' => $data['reference'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => 'posted',
                'created_by' => $userId,
            ]);

            $allocations = $this->allocatePayment(
                $receipt,
                $amount,
                $targets,
                $student->id,
                $academicYearId ?? (int) $targets->first()->academic_year_id,
            );

            return ['receipt' => $receipt, 'allocations' => $allocations];
        });
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  array<string, mixed>  $overrides
     */
    private function persistCharge(Student $student, StudentEnrollment $enrollment, array $item, array $overrides, int $userId): FeeCharge
    {
        $billingKind = (string) $item['billing_kind'];
        [$periodYear, $periodMonth] = $this->periodParts($item);
        $examTerm = $item['exam_term'] ?? null;

        $existing = $this->findExistingCharge($student, $enrollment, $item, $periodYear, $periodMonth);

        if ($existing !== null) {
            return $existing;
        }

        if ($billingKind === BillingKind::Monthly->value) {
            $legacyCharge = FeeCharge::query()
                ->where('student_id', $student->id)
                ->where('academic_year_id', $enrollment->academic_year_id)
                ->where('period_year', $periodYear)
                ->where('period_month', $periodMonth)
                ->where('status', '!=', VoucherStatus::Void->value)
                ->first();

            if ($legacyCharge !== null) {
                return $legacyCharge;
            }

            $legacy = FeeVoucher::query()
                ->where('student_id', $student->id)
                ->where('academic_year_id', $enrollment->academic_year_id)
                ->whereYear('due_date', $periodYear)
                ->whereMonth('due_date', $periodMonth)
                ->where('status', '!=', VoucherStatus::Void->value)
                ->first();

            if ($legacy !== null) {
                return $this->promoteLegacyVoucher($legacy, $enrollment, $userId);
            }
        }

        $charge = FeeCharge::create([
            'institution_id' => $student->institution_id,
            'campus_id' => $student->campus_id,
            'academic_year_id' => $enrollment->academic_year_id,
            'student_id' => $student->id,
            'enrollment_id' => $enrollment->id,
            'class_room_id' => $enrollment->class_room_id,
            'section_id' => $enrollment->section_id,
            'fee_structure_item_id' => $item['fee_structure_item_id'] ?? null,
            'fee_head_id' => $item['fee_head_id'] ?? null,
            'voucher_no' => $this->nextChargeNo($student->campus_id),
            'billing_kind' => $billingKind,
            'exam_term' => $examTerm,
            'period_year' => $periodYear,
            'period_month' => $periodMonth,
            'title' => $item['title'] ?? null,
            'amount' => $overrides['amount'],
            'discount_amount' => $overrides['discount_amount'],
            'paid_amount' => 0,
            'due_date' => $item['due_date'] ?? now()->toDateString(),
            'status' => VoucherStatus::Unpaid->value,
            'source' => $item['source'] ?? 'structure',
            'notes' => $overrides['discount_note'] ?? null,
            'created_by' => $userId,
        ]);

        foreach ($item['lines'] ?? [] as $line) {
            FeeChargeLine::create([
                'fee_charge_id' => $charge->id,
                'fee_head_id' => $line['fee_head_id'] ?? null,
                'description' => $line['description'] ?? ($line['name'] ?? null),
                'amount' => $line['amount'] ?? 0,
                'discount_amount' => $line['discount_amount'] ?? 0,
            ]);
        }

        return $charge;
    }

    private function promoteLegacyVoucher(
        FeeVoucher $legacy,
        StudentEnrollment $enrollment,
        int $userId,
    ): FeeCharge {
        $existing = FeeCharge::query()
            ->where('campus_id', $legacy->campus_id)
            ->where('voucher_no', $legacy->voucher_no)
            ->first();

        if ($existing !== null) {
            return $existing;
        }

        $dueDate = $legacy->due_date ?? now();

        return FeeCharge::create([
            'institution_id' => $legacy->institution_id,
            'campus_id' => $legacy->campus_id,
            'academic_year_id' => $enrollment->academic_year_id,
            'student_id' => $legacy->student_id,
            'enrollment_id' => $enrollment->id,
            'class_room_id' => $enrollment->class_room_id,
            'section_id' => $enrollment->section_id,
            'voucher_no' => $legacy->voucher_no,
            'billing_kind' => BillingKind::LegacyInstallment->value,
            'period_year' => (int) $dueDate->year,
            'period_month' => (int) $dueDate->month,
            'title' => $legacy->voucher_no,
            'amount' => $legacy->amount,
            'discount_amount' => $legacy->discount_amount,
            'paid_amount' => $legacy->paid_amount,
            'due_date' => $dueDate->toDateString(),
            'status' => $legacy->status instanceof VoucherStatus
                ? $legacy->status->value
                : (string) $legacy->status,
            'source' => 'legacy',
            'journal_entry_id' => $legacy->journal_entry_id,
            'created_by' => $userId,
        ]);
    }

    /**
     * Resolve the billing period for an item, falling back to the due date and
     * then the current month so monthly charges always carry a period.
     *
     * @param  array<string, mixed>  $item
     * @return array{0: int, 1: int}
     */
    private function periodParts(array $item): array
    {
        $dueDate = isset($item['due_date']) && $item['due_date']
            ? Carbon::parse($item['due_date'])
            : null;

        $year = isset($item['period_year']) && $item['period_year']
            ? (int) $item['period_year']
            : ($dueDate?->year ?? now()->year);
        $month = isset($item['period_month']) && $item['period_month']
            ? (int) $item['period_month']
            : ($dueDate?->month ?? now()->month);

        return [$year, $month];
    }

    /**
     * Find an existing charge that represents the same invoice. Monthly and
     * exam charges are scoped to the student + academic year + period, while
     * ad-hoc charges additionally match their title/structure item so that
     * distinct one-off charges can still be billed in the same month.
     *
     * @param  array<string, mixed>  $item
     */
    private function findExistingCharge(
        Student $student,
        StudentEnrollment $enrollment,
        array $item,
        int $periodYear,
        int $periodMonth,
    ): ?FeeCharge {
        $billingKind = (string) $item['billing_kind'];

        $query = FeeCharge::query()
            ->where('student_id', $student->id)
            ->where('academic_year_id', $enrollment->academic_year_id)
            ->where('billing_kind', $billingKind)
            ->where('status', '!=', VoucherStatus::Void->value);

        if ($billingKind === BillingKind::Monthly->value) {
            $monthly = $query
                ->where('period_year', $periodYear)
                ->where('period_month', $periodMonth)
                ->first();

            if ($monthly !== null) {
                return $monthly;
            }

            return FeeCharge::query()
                ->where('student_id', $student->id)
                ->where('academic_year_id', $enrollment->academic_year_id)
                ->where('period_year', $periodYear)
                ->where('period_month', $periodMonth)
                ->where('status', '!=', VoucherStatus::Void->value)
                ->first();
        }

        if ($billingKind === BillingKind::Exam->value) {
            return $query
                ->where('exam_term', $item['exam_term'] ?? null)
                ->first();
        }

        if (in_array($billingKind, [BillingKind::OneTime->value, BillingKind::Other->value], true)) {
            return $query
                ->where('period_year', $periodYear)
                ->where('period_month', $periodMonth)
                ->where('title', $item['title'] ?? null)
                ->first();
        }

        return $query
            ->where('fee_structure_item_id', $item['fee_structure_item_id'] ?? null)
            ->first();
    }

    /**
     * @param  Collection<int, FeeCharge>  $created
     * @return Collection<int, FeeReceiptAllocation>
     */
    private function allocatePayment(FeeReceipt $receipt, float $amount, Collection $created, int $studentId, int $academicYearId): Collection
    {
        $allocations = collect();
        $remaining = $amount;

        $targets = $created
            ->sortBy(fn (FeeCharge $charge) => $charge->due_date?->timestamp ?? 0)
            ->values();

        $openCharges = FeeCharge::query()
            ->where('student_id', $studentId)
            ->where('academic_year_id', $academicYearId)
            ->whereIn('status', [VoucherStatus::Unpaid->value, VoucherStatus::Partial->value])
            ->whereNotIn('id', $targets->pluck('id'))
            ->orderBy('due_date')
            ->get();

        $queue = $targets->concat($openCharges);

        foreach ($queue as $charge) {
            if ($remaining <= 0) {
                break;
            }

            $balance = $charge->balance();

            if ($balance <= 0) {
                continue;
            }

            $applied = min($balance, $remaining);

            FeeReceiptAllocation::create([
                'fee_receipt_id' => $receipt->id,
                'fee_charge_id' => $charge->id,
                'amount' => $applied,
            ]);

            $newPaid = round((float) $charge->paid_amount + $applied, 2);
            $charge->update([
                'paid_amount' => $newPaid,
                'status' => $newPaid >= (float) $charge->amount
                    ? VoucherStatus::Paid->value
                    : VoucherStatus::Partial->value,
            ]);

            $remaining = round($remaining - $applied, 2);
            $allocations->push(new FeeReceiptAllocation([
                'fee_receipt_id' => $receipt->id,
                'fee_charge_id' => $charge->id,
                'amount' => $applied,
            ]));
        }

        return $allocations;
    }

    /**
     * @param  array<int, string>  $billedMonths
     * @return array<int, array<string, mixed>>
     */
    private function pendingMonths(StudentEnrollment $enrollment, ?FeeStructure $structure, array $billedMonths): array
    {
        if ($structure === null) {
            return [];
        }

        $monthly = $this->monthlyTotal($structure);

        if ($monthly <= 0) {
            return [];
        }

        $start = $enrollment->starts_on
            ?? $enrollment->academicYear?->starts_on
            ?? now()->startOfYear();

        $cursor = Carbon::parse($start)->startOfMonth();
        $end = Carbon::now()->startOfMonth();
        $pending = [];

        while ($cursor->lte($end)) {
            $key = $cursor->year.'-'.$cursor->month;

            if (! in_array($key, $billedMonths, true)) {
                $pending[] = [
                    'period_year' => (int) $cursor->year,
                    'period_month' => (int) $cursor->month,
                    'amount' => number_format($monthly, 2, '.', ''),
                ];
            }

            $cursor->addMonth();
        }

        return $pending;
    }

    private function monthlyTotal(FeeStructure $structure): float
    {
        return (float) $structure->items
            ->where('billing_kind', BillingKind::Monthly)
            ->where('is_active', true)
            ->sum('amount');
    }

    private function nextChargeNo(int $campusId): string
    {
        $sequence = FeeCharge::withTrashed()->where('campus_id', $campusId)->count() + 1;

        do {
            $number = sprintf('FV-%06d', $sequence);
            $sequence++;
        } while (
            FeeCharge::withTrashed()->where('campus_id', $campusId)->where('voucher_no', $number)->exists()
            || FeeVoucher::withTrashed()->where('campus_id', $campusId)->where('voucher_no', $number)->exists()
        );

        return $number;
    }

    private function nextReceiptNo(int $campusId): string
    {
        $sequence = FeeReceipt::withTrashed()->where('campus_id', $campusId)->count() + 1;

        do {
            $number = sprintf('RV-%06d', $sequence);
            $sequence++;
        } while (
            FeeReceipt::withTrashed()->where('campus_id', $campusId)->where('receipt_no', $number)->exists()
            || FeePayment::withTrashed()->where('campus_id', $campusId)->where('receipt_no', $number)->exists()
        );

        return $number;
    }
}
