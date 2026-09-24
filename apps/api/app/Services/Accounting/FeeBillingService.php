<?php

namespace App\Services\Accounting;

use App\Enums\JournalStatus;
use App\Enums\LateFeeType;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\VoucherStatus;
use App\Models\ChartOfAccount;
use App\Models\FeeInstallment;
use App\Models\FeePayment;
use App\Models\FeePlan;
use App\Models\FeeRefund;
use App\Models\FeeVoucher;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\StudentEnrollment;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Turns a fee plan into per-student vouchers and posts both billing and
 * collection to the double-entry ledger.
 *
 * Billing:  Dr Student Fee Receivable   Cr each fee-head income account (net)
 * Payment:  Dr Cash/Bank                Cr Student Fee Receivable
 */
class FeeBillingService
{
    public function __construct(private readonly JournalService $journals) {}

    /**
     * @param  array<int, float|int>  $discounts  keyed by student id (annual amount)
     * @return array{created: int, skipped: int}
     */
    public function generateForClass(FeePlan $plan, array $discounts = [], ?int $userId = null): array
    {
        $plan->load(['items.feeHead.incomeAccount', 'installments']);

        $items = $plan->items->where('is_optional', false)->values();
        $installments = $plan->installments->values();

        if ($items->isEmpty()) {
            throw ValidationException::withMessages([
                'fee_plan_id' => ['The fee plan has no required fee items.'],
            ]);
        }

        if ($installments->isEmpty()) {
            throw ValidationException::withMessages([
                'fee_plan_id' => ['The fee plan has no installment schedule.'],
            ]);
        }

        $enrollments = StudentEnrollment::query()
            ->where('academic_year_id', $plan->academic_year_id)
            ->where('class_room_id', $plan->class_room_id)
            ->where('status', 'active')
            ->get();

        $created = 0;
        $skipped = 0;

        foreach ($enrollments as $enrollment) {
            foreach ($installments as $installment) {
                $exists = FeeVoucher::query()
                    ->where('student_id', $enrollment->student_id)
                    ->where('fee_installment_id', $installment->id)
                    ->exists();

                if ($exists) {
                    $skipped++;

                    continue;
                }

                $this->createVoucher($plan, $enrollment, $installment, $items, (float) ($discounts[$enrollment->student_id] ?? 0), $userId);
                $created++;
            }
        }

        return ['created' => $created, 'skipped' => $skipped];
    }

    public function issue(FeeVoucher $voucher, ?int $userId): FeeVoucher
    {
        if ($voucher->journal_entry_id !== null) {
            abort(409, 'The voucher has already been issued.');
        }

        $lines = $voucher->lines()->with('feeHead.incomeAccount')->get();

        if ($lines->isEmpty()) {
            throw ValidationException::withMessages([
                'voucher' => ['The voucher has no lines to post.'],
            ]);
        }

        $receivable = $this->resolveAccount(config('finance.accounts.receivable'));
        $date = now()->toDateString();
        $fiscalYear = $this->fiscalYearFor($date);

        $journalLines = [[
            'chart_of_account_id' => $receivable->id,
            'description' => "Fee voucher {$voucher->voucher_no}",
            'debit' => (float) $voucher->amount,
            'credit' => 0,
        ]];

        foreach ($lines as $line) {
            $net = round((float) $line->amount - (float) $line->discount_amount, 2);

            if ($net <= 0) {
                continue;
            }

            $account = $line->feeHead?->incomeAccount;

            if ($account === null) {
                throw ValidationException::withMessages([
                    'voucher' => ["Fee head [{$line->feeHead?->name}] has no income account to post to."],
                ]);
            }

            $journalLines[] = [
                'chart_of_account_id' => $account->id,
                'description' => $line->feeHead->name,
                'debit' => 0,
                'credit' => $net,
            ];
        }

        DB::transaction(function () use ($voucher, $journalLines, $fiscalYear, $date, $userId) {
            $entry = JournalEntry::create([
                'institution_id' => $voucher->institution_id,
                'campus_id' => $voucher->campus_id,
                'fiscal_year_id' => $fiscalYear->id,
                'reference' => $this->journals->nextReference($fiscalYear->id, $fiscalYear->code),
                'entry_date' => $date,
                'status' => JournalStatus::Draft,
                'memo' => "Fee voucher {$voucher->voucher_no} issued",
                'source_type' => $voucher->getMorphClass(),
                'source_id' => $voucher->id,
            ]);

            foreach ($journalLines as $index => $line) {
                $entry->lines()->create([...$line, 'line_no' => $index + 1]);
            }

            $this->journals->post($entry, $userId);

            $voucher->forceFill([
                'journal_entry_id' => $entry->id,
                'issued_at' => now(),
            ])->save();
        });

        return $voucher->refresh()->load('lines.feeHead');
    }

    public function recordPayment(FeePayment $payment, ?int $userId): FeePayment
    {
        $payment->loadMissing('voucher');

        $amount = (float) $payment->amount;

        if ($amount <= 0) {
            throw ValidationException::withMessages(['amount' => ['The payment amount must be greater than zero.']]);
        }

        if ($payment->voucher !== null && $payment->voucher->journal_entry_id === null) {
            throw ValidationException::withMessages(['fee_voucher_id' => ['The voucher must be issued before it can be paid.']]);
        }

        $debitAccount = $this->resolveAccount($this->collectionAccountCode($payment->method));
        $isAdvance = $payment->fee_voucher_id === null;
        $creditAccount = $this->resolveAccount(config($isAdvance ? 'finance.accounts.advance' : 'finance.accounts.receivable'));
        $fiscalYear = $this->fiscalYearFor($payment->payment_date->toDateString());

        DB::transaction(function () use ($payment, $debitAccount, $creditAccount, $isAdvance, $fiscalYear, $userId) {
            $entry = JournalEntry::create([
                'institution_id' => $payment->institution_id,
                'campus_id' => $payment->campus_id,
                'fiscal_year_id' => $fiscalYear->id,
                'reference' => $this->journals->nextReference($fiscalYear->id, $fiscalYear->code),
                'entry_date' => $payment->payment_date->toDateString(),
                'status' => JournalStatus::Draft,
                'memo' => "Fee receipt {$payment->receipt_no}",
                'source_type' => $payment->getMorphClass(),
                'source_id' => $payment->id,
            ]);

            $entry->lines()->createMany([
                [
                    'chart_of_account_id' => $debitAccount->id,
                    'line_no' => 1,
                    'description' => $debitAccount->name,
                    'debit' => (float) $payment->amount,
                    'credit' => 0,
                ],
                [
                    'chart_of_account_id' => $creditAccount->id,
                    'line_no' => 2,
                    'description' => $isAdvance ? 'Fee received in advance' : 'Fee receivable',
                    'debit' => 0,
                    'credit' => (float) $payment->amount,
                ],
            ]);

            $this->journals->post($entry, $userId);

            $payment->forceFill([
                'journal_entry_id' => $entry->id,
                'status' => PaymentStatus::Posted,
            ])->save();

            if ($payment->voucher !== null) {
                $this->recalculateVoucher($payment->voucher);
            }
        });

        return $payment->refresh();
    }

    public function voidPayment(FeePayment $payment, ?int $userId, ?string $memo = null): FeePayment
    {
        if ($payment->status !== PaymentStatus::Posted) {
            abort(409, 'Only posted payments can be voided.');
        }

        $payment->loadMissing('voucher');

        DB::transaction(function () use ($payment, $userId, $memo) {
            if ($payment->journalEntry !== null) {
                $this->journals->reverse($payment->journalEntry, $userId, $memo);
            }

            $payment->forceFill(['status' => PaymentStatus::Void])->save();

            if ($payment->voucher !== null) {
                $this->recalculateVoucher($payment->voucher);
            }
        });

        return $payment->refresh();
    }

    public function voidVoucher(FeeVoucher $voucher, ?int $userId, ?string $memo = null): FeeVoucher
    {
        if ($voucher->status === VoucherStatus::Void) {
            abort(409, 'The voucher is already void.');
        }

        if ($voucher->payments()->where('status', PaymentStatus::Posted->value)->exists()) {
            throw ValidationException::withMessages([
                'voucher' => ['Void the payments on this voucher before voiding it.'],
            ]);
        }

        DB::transaction(function () use ($voucher, $userId, $memo) {
            if ($voucher->journalEntry !== null) {
                $this->journals->reverse($voucher->journalEntry, $userId, $memo);
            }

            $voucher->forceFill(['status' => VoucherStatus::Void])->save();
        });

        return $voucher->refresh();
    }

    public function applyLateFee(FeeVoucher $voucher, ?int $userId): FeeVoucher
    {
        $voucher->loadMissing('feePlan');

        if ($voucher->status === VoucherStatus::Void) {
            abort(409, 'Cannot apply a late fee to a void voucher.');
        }

        if ($voucher->late_fee_applied_at !== null) {
            throw ValidationException::withMessages([
                'voucher' => ['A late fee has already been applied to this voucher.'],
            ]);
        }

        $plan = $voucher->feePlan;
        $type = $plan?->late_fee_type ?? LateFeeType::None;

        if ($plan === null || $type === LateFeeType::None || (float) $plan->late_fee_amount <= 0) {
            throw ValidationException::withMessages([
                'voucher' => ['The fee plan has no late fee policy.'],
            ]);
        }

        $daysOverdue = $voucher->due_date === null
            ? 0
            : (int) $voucher->due_date->startOfDay()->diffInDays(now()->startOfDay(), false);

        if ($daysOverdue <= (int) $plan->late_fee_grace_days) {
            throw ValidationException::withMessages([
                'voucher' => ['The voucher is still within the late fee grace period.'],
            ]);
        }

        $amount = $type === LateFeeType::Flat
            ? round((float) $plan->late_fee_amount, 2)
            : round((float) $voucher->amount * (float) $plan->late_fee_amount / 100, 2);

        if ($amount <= 0) {
            throw ValidationException::withMessages([
                'voucher' => ['The computed late fee is zero.'],
            ]);
        }

        $receivable = $this->resolveAccount(config('finance.accounts.receivable'));
        $income = $this->resolveAccount(config('finance.accounts.late_fee_income'));
        $date = now()->toDateString();
        $fiscalYear = $this->fiscalYearFor($date);

        DB::transaction(function () use ($voucher, $receivable, $income, $amount, $date, $fiscalYear, $userId) {
            $entry = JournalEntry::create([
                'institution_id' => $voucher->institution_id,
                'campus_id' => $voucher->campus_id,
                'fiscal_year_id' => $fiscalYear->id,
                'reference' => $this->journals->nextReference($fiscalYear->id, $fiscalYear->code),
                'entry_date' => $date,
                'status' => JournalStatus::Draft,
                'memo' => "Late fee on voucher {$voucher->voucher_no}",
                'source_type' => $voucher->getMorphClass(),
                'source_id' => $voucher->id,
            ]);

            $entry->lines()->createMany([
                [
                    'chart_of_account_id' => $receivable->id,
                    'line_no' => 1,
                    'description' => 'Late fee receivable',
                    'debit' => $amount,
                    'credit' => 0,
                ],
                [
                    'chart_of_account_id' => $income->id,
                    'line_no' => 2,
                    'description' => 'Late fee income',
                    'debit' => 0,
                    'credit' => $amount,
                ],
            ]);

            $this->journals->post($entry, $userId);

            $voucher->forceFill([
                'late_fee_amount' => round((float) $voucher->late_fee_amount + $amount, 2),
                'amount' => round((float) $voucher->amount + $amount, 2),
                'late_fee_applied_at' => now(),
            ])->save();

            $this->recalculateVoucher($voucher);
        });

        return $voucher->refresh();
    }

    public function applyAdvance(FeePayment $payment, FeeVoucher $voucher, ?int $userId): FeePayment
    {
        if ($payment->fee_voucher_id !== null) {
            abort(409, 'Only unapplied advance payments can be allocated.');
        }

        if ($payment->status !== PaymentStatus::Posted) {
            abort(409, 'Only posted payments can be allocated.');
        }

        if ($voucher->status === VoucherStatus::Void) {
            abort(409, 'Cannot allocate an advance to a void voucher.');
        }

        if ($voucher->student_id !== $payment->student_id) {
            throw ValidationException::withMessages([
                'fee_voucher_id' => ['The voucher does not belong to the payment student.'],
            ]);
        }

        $outstanding = round((float) $voucher->amount - (float) $voucher->paid_amount, 2);

        if ((float) $payment->amount > $outstanding + 0.005) {
            throw ValidationException::withMessages([
                'fee_voucher_id' => ["The advance exceeds the voucher balance of {$outstanding}."],
            ]);
        }

        $advance = $this->resolveAccount(config('finance.accounts.advance'));
        $receivable = $this->resolveAccount(config('finance.accounts.receivable'));
        $date = now()->toDateString();
        $fiscalYear = $this->fiscalYearFor($date);

        DB::transaction(function () use ($payment, $voucher, $advance, $receivable, $date, $fiscalYear, $userId) {
            $entry = JournalEntry::create([
                'institution_id' => $payment->institution_id,
                'campus_id' => $payment->campus_id,
                'fiscal_year_id' => $fiscalYear->id,
                'reference' => $this->journals->nextReference($fiscalYear->id, $fiscalYear->code),
                'entry_date' => $date,
                'status' => JournalStatus::Draft,
                'memo' => "Advance {$payment->receipt_no} applied to voucher {$voucher->voucher_no}",
                'source_type' => $payment->getMorphClass(),
                'source_id' => $payment->id,
            ]);

            $entry->lines()->createMany([
                [
                    'chart_of_account_id' => $advance->id,
                    'line_no' => 1,
                    'description' => 'Fee advance applied',
                    'debit' => (float) $payment->amount,
                    'credit' => 0,
                ],
                [
                    'chart_of_account_id' => $receivable->id,
                    'line_no' => 2,
                    'description' => 'Fee receivable',
                    'debit' => 0,
                    'credit' => (float) $payment->amount,
                ],
            ]);

            $this->journals->post($entry, $userId);

            $payment->forceFill(['fee_voucher_id' => $voucher->id])->save();

            $this->recalculateVoucher($voucher);
        });

        return $payment->refresh();
    }

    public function recordRefund(FeeRefund $refund, ?int $userId): FeeRefund
    {
        $refund->loadMissing('payment.voucher');

        $payment = $refund->payment;

        if ($payment === null) {
            throw ValidationException::withMessages([
                'fee_payment_id' => ['A refund must reference an existing payment.'],
            ]);
        }

        if ($payment->status !== PaymentStatus::Posted) {
            throw ValidationException::withMessages([
                'fee_payment_id' => ['Only posted payments can be refunded.'],
            ]);
        }

        $amount = (float) $refund->amount;

        if ($amount <= 0) {
            throw ValidationException::withMessages(['amount' => ['The refund amount must be greater than zero.']]);
        }

        $refunded = (float) FeeRefund::query()
            ->where('fee_payment_id', $payment->id)
            ->where('status', PaymentStatus::Posted->value)
            ->sum('amount');

        if ($refunded + $amount > (float) $payment->amount + 0.005) {
            $remaining = round((float) $payment->amount - $refunded, 2);

            throw ValidationException::withMessages([
                'amount' => ["The refund exceeds the remaining refundable amount of {$remaining}."],
            ]);
        }

        $isAdvance = $payment->fee_voucher_id === null;
        $debit = $this->resolveAccount(config($isAdvance ? 'finance.accounts.advance' : 'finance.accounts.receivable'));
        $credit = $this->resolveAccount($this->collectionAccountCode($refund->method));
        $fiscalYear = $this->fiscalYearFor($refund->refund_date->toDateString());

        DB::transaction(function () use ($refund, $payment, $debit, $credit, $isAdvance, $fiscalYear, $userId) {
            $entry = JournalEntry::create([
                'institution_id' => $refund->institution_id,
                'campus_id' => $refund->campus_id,
                'fiscal_year_id' => $fiscalYear->id,
                'reference' => $this->journals->nextReference($fiscalYear->id, $fiscalYear->code),
                'entry_date' => $refund->refund_date->toDateString(),
                'status' => JournalStatus::Draft,
                'memo' => "Fee refund {$refund->receipt_no}",
                'source_type' => $refund->getMorphClass(),
                'source_id' => $refund->id,
            ]);

            $entry->lines()->createMany([
                [
                    'chart_of_account_id' => $debit->id,
                    'line_no' => 1,
                    'description' => $isAdvance ? 'Fee advance refunded' : 'Fee receivable (refund)',
                    'debit' => (float) $refund->amount,
                    'credit' => 0,
                ],
                [
                    'chart_of_account_id' => $credit->id,
                    'line_no' => 2,
                    'description' => $credit->name,
                    'debit' => 0,
                    'credit' => (float) $refund->amount,
                ],
            ]);

            $this->journals->post($entry, $userId);

            $refund->forceFill([
                'journal_entry_id' => $entry->id,
                'status' => PaymentStatus::Posted,
            ])->save();

            if ($payment->voucher !== null) {
                $this->recalculateVoucher($payment->voucher);
            }
        });

        return $refund->refresh();
    }

    public function recalculateVoucher(FeeVoucher $voucher): FeeVoucher
    {
        $paymentIds = $voucher->payments()->pluck('id');

        $paid = (float) $voucher->payments()
            ->where('status', PaymentStatus::Posted->value)
            ->sum('amount');

        $refunded = (float) FeeRefund::query()
            ->whereIn('fee_payment_id', $paymentIds)
            ->where('status', PaymentStatus::Posted->value)
            ->sum('amount');

        $paid = max(round($paid - $refunded, 2), 0);

        $status = match (true) {
            $paid <= 0 => VoucherStatus::Unpaid,
            $paid + 0.005 >= (float) $voucher->amount => VoucherStatus::Paid,
            default => VoucherStatus::Partial,
        };

        $voucher->forceFill([
            'paid_amount' => $paid,
            'status' => $status,
        ])->save();

        return $voucher;
    }

    /**
     * @param  Collection<int, FeePlanItem>  $items
     */
    private function createVoucher(
        FeePlan $plan,
        StudentEnrollment $enrollment,
        FeeInstallment $installment,
        Collection $items,
        float $annualDiscount,
        ?int $userId,
    ): FeeVoucher {
        $ratio = (float) $installment->percentage / 100;

        $grossAmounts = $items->map(fn ($item) => round((float) $item->amount * $ratio, 2))->all();
        $installmentGross = round(array_sum($grossAmounts), 2);

        $installmentDiscount = min(round($annualDiscount * $ratio, 2), $installmentGross);
        $discountAmounts = $this->allocateDiscount($grossAmounts, $installmentDiscount);

        $voucher = FeeVoucher::create([
            'institution_id' => $plan->institution_id,
            'campus_id' => $plan->campus_id,
            'student_id' => $enrollment->student_id,
            'academic_year_id' => $plan->academic_year_id,
            'fee_plan_id' => $plan->id,
            'fee_installment_id' => $installment->id,
            'sequence' => $installment->sequence,
            'voucher_no' => $this->nextVoucherNo($plan->campus_id),
            'due_date' => $installment->due_date,
            'gross_amount' => $installmentGross,
            'discount_amount' => array_sum($discountAmounts),
            'amount' => round($installmentGross - array_sum($discountAmounts), 2),
            'paid_amount' => 0,
            'status' => VoucherStatus::Unpaid,
        ]);

        foreach ($items->values() as $index => $item) {
            $voucher->lines()->create([
                'fee_head_id' => $item->fee_head_id,
                'amount' => $grossAmounts[$index],
                'discount_amount' => $discountAmounts[$index],
            ]);
        }

        return $this->issue($voucher, $userId);
    }

    /**
     * Spread a discount across lines proportionally to their gross amount,
     * fixing rounding drift on the final line.
     *
     * @param  array<int, float>  $grossAmounts
     * @return array<int, float>
     */
    private function allocateDiscount(array $grossAmounts, float $discount): array
    {
        $count = count($grossAmounts);
        $allocated = array_fill(0, $count, 0.0);

        if ($discount <= 0 || $count === 0) {
            return $allocated;
        }

        $total = array_sum($grossAmounts);

        if ($total <= 0) {
            return $allocated;
        }

        $remaining = $discount;

        foreach ($grossAmounts as $index => $gross) {
            if ($index === $count - 1) {
                $allocated[$index] = round(max($remaining, 0), 2);

                break;
            }

            $share = round($gross / $total * $discount, 2);
            $share = min($share, $gross);
            $allocated[$index] = $share;
            $remaining -= $share;
        }

        return $allocated;
    }

    private function resolveAccount(string $code): ChartOfAccount
    {
        $account = ChartOfAccount::query()
            ->where('code', $code)
            ->where('is_group', false)
            ->first();

        if ($account === null) {
            throw ValidationException::withMessages([
                'account' => ["Chart of accounts is missing the required account [{$code}]."],
            ]);
        }

        return $account;
    }

    private function collectionAccountCode(PaymentMethod $method): string
    {
        return $method === PaymentMethod::Cash
            ? config('finance.accounts.cash')
            : config('finance.accounts.bank');
    }

    private function fiscalYearFor(string $date): FiscalYear
    {
        $fiscalYear = FiscalYear::query()
            ->whereDate('starts_on', '<=', $date)
            ->whereDate('ends_on', '>=', $date)
            ->orderByDesc('starts_on')
            ->first()
            ?? FiscalYear::query()->where('is_current', true)->first();

        if ($fiscalYear === null) {
            throw ValidationException::withMessages([
                'fiscal_year' => ['No fiscal year covers this date. Create a fiscal year first.'],
            ]);
        }

        return $fiscalYear;
    }

    private function nextVoucherNo(int $campusId): string
    {
        $sequence = FeeVoucher::withTrashed()->where('campus_id', $campusId)->count() + 1;

        do {
            $number = sprintf('FV-%06d', $sequence);
            $sequence++;
        } while (FeeVoucher::withTrashed()->where('campus_id', $campusId)->where('voucher_no', $number)->exists());

        return $number;
    }

    public function nextReceiptNo(int $campusId): string
    {
        $sequence = FeePayment::withTrashed()->where('campus_id', $campusId)->count() + 1;

        do {
            $number = sprintf('RV-%06d', $sequence);
            $sequence++;
        } while (FeePayment::withTrashed()->where('campus_id', $campusId)->where('receipt_no', $number)->exists());

        return $number;
    }

    public function nextRefundNo(int $campusId): string
    {
        $sequence = FeeRefund::withTrashed()->where('campus_id', $campusId)->count() + 1;

        do {
            $number = sprintf('RF-%06d', $sequence);
            $sequence++;
        } while (FeeRefund::withTrashed()->where('campus_id', $campusId)->where('receipt_no', $number)->exists());

        return $number;
    }
}
