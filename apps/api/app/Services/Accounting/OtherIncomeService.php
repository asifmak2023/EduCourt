<?php

namespace App\Services\Accounting;

use App\Enums\IncomeStatus;
use App\Enums\JournalStatus;
use App\Enums\PaymentMethod;
use App\Models\ChartOfAccount;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\OtherIncome;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Posts non-fee income (donations, sales, commissions, exam fees and charges)
 * to the double-entry ledger.
 *
 * Receipt: Dr Cash/Bank   Cr income account
 */
class OtherIncomeService
{
    public function __construct(private readonly JournalService $journals) {}

    public function post(OtherIncome $income, ?int $userId): OtherIncome
    {
        if ($income->status !== IncomeStatus::Draft) {
            abort(409, 'Only draft income receipts can be posted.');
        }

        $amount = (float) $income->amount;

        if ($amount <= 0) {
            throw ValidationException::withMessages(['amount' => ['The amount must be greater than zero.']]);
        }

        $income->loadMissing('source.incomeAccount');

        $credit = $this->incomeAccount($income);
        $debit = $this->resolveAccount($this->collectionAccountCode($income->method));
        $fiscalYear = $this->fiscalYearFor($income->received_on->toDateString());

        DB::transaction(function () use ($income, $credit, $debit, $fiscalYear, $userId) {
            $entry = JournalEntry::create([
                'institution_id' => $income->institution_id,
                'campus_id' => $income->campus_id,
                'fiscal_year_id' => $fiscalYear->id,
                'reference' => $this->journals->nextReference($fiscalYear->id, $fiscalYear->code),
                'entry_date' => $income->received_on->toDateString(),
                'status' => JournalStatus::Draft,
                'memo' => "Other income receipt {$income->receipt_no}",
                'source_type' => $income->getMorphClass(),
                'source_id' => $income->id,
            ]);

            $entry->lines()->createMany([
                [
                    'chart_of_account_id' => $debit->id,
                    'line_no' => 1,
                    'description' => $income->payer_name ?? $debit->name,
                    'debit' => (float) $income->amount,
                    'credit' => 0,
                ],
                [
                    'chart_of_account_id' => $credit->id,
                    'line_no' => 2,
                    'description' => $income->source?->name ?? $credit->name,
                    'debit' => 0,
                    'credit' => (float) $income->amount,
                ],
            ]);

            $this->journals->post($entry, $userId);

            $income->forceFill([
                'journal_entry_id' => $entry->id,
                'fiscal_year_id' => $fiscalYear->id,
                'status' => IncomeStatus::Posted,
            ])->save();
        });

        return $income->refresh()->load(['source', 'journalEntry']);
    }

    public function void(OtherIncome $income, ?int $userId, ?string $memo = null): OtherIncome
    {
        if ($income->status === IncomeStatus::Void) {
            abort(409, 'The income receipt is already void.');
        }

        DB::transaction(function () use ($income, $userId, $memo) {
            if ($income->journalEntry !== null) {
                $this->journals->reverse($income->journalEntry, $userId, $memo);
            }

            $income->forceFill([
                'status' => IncomeStatus::Void,
                'voided_at' => now(),
            ])->save();
        });

        return $income->refresh();
    }

    public function nextReceiptNo(int $campusId): string
    {
        $sequence = OtherIncome::withTrashed()->where('campus_id', $campusId)->count() + 1;

        do {
            $receiptNo = sprintf('INC-%06d', $sequence);
            $sequence++;
        } while (OtherIncome::withTrashed()->where('campus_id', $campusId)->where('receipt_no', $receiptNo)->exists());

        return $receiptNo;
    }

    private function incomeAccount(OtherIncome $income): ChartOfAccount
    {
        if ($income->source?->income_account_id !== null) {
            $account = ChartOfAccount::query()
                ->whereKey($income->source->income_account_id)
                ->where('is_group', false)
                ->first();

            if ($account !== null) {
                return $account;
            }
        }

        $code = $income->source?->category?->defaultAccountCode()
            ?? config('finance.accounts.other_income');

        return $this->resolveAccount($code);
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
}
