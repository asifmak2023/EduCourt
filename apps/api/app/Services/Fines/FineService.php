<?php

namespace App\Services\Fines;

use App\Enums\FineStatus;
use App\Enums\JournalStatus;
use App\Enums\VoucherStatus;
use App\Models\ChartOfAccount;
use App\Models\FeeVoucher;
use App\Models\FeeVoucherLine;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\StudentFine;
use App\Services\Accounting\FeeBillingService;
use App\Services\Accounting\JournalService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Posts student fines onto an outstanding fee voucher and the ledger.
 *
 * Posting: Dr Student Fee Receivable   Cr fine-head income account
 */
class FineService
{
    public function __construct(
        private readonly JournalService $journals,
        private readonly FeeBillingService $billing,
    ) {}

    public function apply(StudentFine $fine, ?int $userId): StudentFine
    {
        if ($fine->status !== FineStatus::Pending) {
            throw ValidationException::withMessages([
                'status' => ['Only a pending fine can be applied.'],
            ]);
        }

        $rule = $fine->rule;

        if ($rule === null || $rule->feeHead === null || $rule->feeHead->incomeAccount === null) {
            throw ValidationException::withMessages([
                'fine_rule_id' => ['The fine rule must reference a fee head with an income account.'],
            ]);
        }

        $voucher = $fine->fee_voucher_id !== null
            ? FeeVoucher::query()->find($fine->fee_voucher_id)
            : $this->outstandingVoucher($fine->student_id);

        if ($voucher === null) {
            throw ValidationException::withMessages([
                'fee_voucher_id' => ['The student has no outstanding voucher to apply this fine to.'],
            ]);
        }

        if ($voucher->student_id !== $fine->student_id) {
            throw ValidationException::withMessages([
                'fee_voucher_id' => ['The voucher does not belong to the fined student.'],
            ]);
        }

        if ($voucher->status === VoucherStatus::Void) {
            throw ValidationException::withMessages([
                'fee_voucher_id' => ['A fine cannot be applied to a void voucher.'],
            ]);
        }

        $amount = (float) $fine->amount;

        if ($amount <= 0) {
            throw ValidationException::withMessages(['amount' => ['The fine amount must be greater than zero.']]);
        }

        $receivable = $this->account(config('finance.accounts.receivable'));
        $income = $rule->feeHead->incomeAccount;
        $fiscalYear = $this->currentFiscalYear();
        $date = $fine->issued_on->toDateString();

        DB::transaction(function () use ($fine, $rule, $voucher, $receivable, $income, $amount, $fiscalYear, $date, $userId) {
            $entry = JournalEntry::create([
                'institution_id' => $fine->institution_id,
                'campus_id' => $fine->campus_id,
                'fiscal_year_id' => $fiscalYear->id,
                'reference' => $this->journals->nextReference($fiscalYear->id, $fiscalYear->code),
                'entry_date' => $date,
                'status' => JournalStatus::Draft,
                'memo' => "Fine {$rule->code} on voucher {$voucher->voucher_no}",
                'source_type' => $fine->getMorphClass(),
                'source_id' => $fine->id,
            ]);

            $entry->lines()->createMany([
                [
                    'chart_of_account_id' => $receivable->id,
                    'line_no' => 1,
                    'description' => 'Fine receivable',
                    'debit' => $amount,
                    'credit' => 0,
                ],
                [
                    'chart_of_account_id' => $income->id,
                    'line_no' => 2,
                    'description' => 'Fine income',
                    'debit' => 0,
                    'credit' => $amount,
                ],
            ]);

            $this->journals->post($entry, $userId);

            $this->addVoucherLine($voucher, $rule->fee_head_id, $amount);

            $voucher->forceFill(['amount' => round((float) $voucher->amount + $amount, 2)])->save();
            $this->billing->recalculateVoucher($voucher);

            $fine->forceFill([
                'fee_voucher_id' => $voucher->id,
                'journal_entry_id' => $entry->id,
                'status' => FineStatus::Applied,
                'applied_at' => now(),
            ])->save();
        });

        return $fine->refresh();
    }

    public function waive(StudentFine $fine, ?int $userId, ?string $reason): StudentFine
    {
        if ($fine->status !== FineStatus::Pending) {
            throw ValidationException::withMessages([
                'status' => ['Only a pending fine can be waived.'],
            ]);
        }

        $fine->forceFill([
            'status' => FineStatus::Waived,
            'waived_by' => $userId,
            'waived_at' => now(),
            'waived_reason' => $reason,
        ])->save();

        return $fine->refresh();
    }

    public function revoke(StudentFine $fine, ?int $userId, ?string $memo): StudentFine
    {
        if ($fine->status !== FineStatus::Applied || $fine->journal_entry_id === null) {
            throw ValidationException::withMessages([
                'status' => ['Only an applied fine can be revoked.'],
            ]);
        }

        $fine->loadMissing(['voucher', 'rule.feeHead']);

        $amount = (float) $fine->amount;
        $voucher = $fine->voucher;

        DB::transaction(function () use ($fine, $voucher, $amount, $userId, $memo) {
            $entry = $fine->journalEntry;

            if ($entry !== null) {
                $this->journals->reverse($entry, $userId, $memo ?? 'Fine revoked');
            }

            if ($voucher !== null && $fine->rule?->fee_head_id !== null) {
                $this->removeVoucherLine($voucher, $fine->rule->fee_head_id, $amount);

                $voucher->forceFill(['amount' => round(max((float) $voucher->amount - $amount, 0), 2)])->save();
                $this->billing->recalculateVoucher($voucher);
            }

            $fine->forceFill(['status' => FineStatus::Revoked])->save();
        });

        return $fine->refresh();
    }

    private function outstandingVoucher(int $studentId): ?FeeVoucher
    {
        return FeeVoucher::query()
            ->where('student_id', $studentId)
            ->whereIn('status', [VoucherStatus::Unpaid->value, VoucherStatus::Partial->value])
            ->orderBy('due_date')
            ->orderBy('id')
            ->first();
    }

    private function addVoucherLine(FeeVoucher $voucher, int $feeHeadId, float $amount): void
    {
        $line = FeeVoucherLine::query()
            ->where('fee_voucher_id', $voucher->id)
            ->where('fee_head_id', $feeHeadId)
            ->first();

        if ($line === null) {
            FeeVoucherLine::create([
                'fee_voucher_id' => $voucher->id,
                'fee_head_id' => $feeHeadId,
                'amount' => $amount,
                'discount_amount' => 0,
            ]);

            return;
        }

        $line->forceFill(['amount' => round((float) $line->amount + $amount, 2)])->save();
    }

    private function removeVoucherLine(FeeVoucher $voucher, int $feeHeadId, float $amount): void
    {
        $line = FeeVoucherLine::query()
            ->where('fee_voucher_id', $voucher->id)
            ->where('fee_head_id', $feeHeadId)
            ->first();

        if ($line === null) {
            return;
        }

        $remaining = round((float) $line->amount - $amount, 2);

        if ($remaining <= 0) {
            $line->delete();

            return;
        }

        $line->forceFill(['amount' => $remaining])->save();
    }

    private function account(string $code): ChartOfAccount
    {
        return ChartOfAccount::query()->where('code', $code)->firstOrFail();
    }

    private function currentFiscalYear(): FiscalYear
    {
        return FiscalYear::query()
            ->where('is_current', true)
            ->firstOrFail();
    }
}
