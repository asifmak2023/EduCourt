<?php

namespace App\Services\Accounting;

use App\Enums\JournalStatus;
use App\Enums\PaymentMethod;
use App\Enums\TaxReturnStatus;
use App\Enums\TaxType;
use App\Models\ChartOfAccount;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\TaxReturn;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Tracks tax filings and posts tax settlements to the double-entry ledger.
 *
 * Settlement: Dr Tax Payable   Cr Cash/Bank
 */
class TaxService
{
    public function __construct(private readonly JournalService $journals) {}

    public function file(TaxReturn $taxReturn, ?string $reference, ?int $userId): TaxReturn
    {
        if ($taxReturn->status === TaxReturnStatus::Paid) {
            abort(409, 'The tax return is already paid.');
        }

        $taxReturn->forceFill([
            'status' => TaxReturnStatus::Filed,
            'reference' => $reference ?? $taxReturn->reference,
            'filed_at' => now(),
        ])->save();

        return $taxReturn->refresh();
    }

    public function pay(TaxReturn $taxReturn, PaymentMethod $method, string $date, ?int $userId, ?string $memo = null): TaxReturn
    {
        if ($taxReturn->status === TaxReturnStatus::Paid) {
            abort(409, 'The tax return is already paid.');
        }

        $amount = (float) $taxReturn->tax_amount;

        if ($amount <= 0) {
            throw ValidationException::withMessages(['tax_amount' => ['There is no tax amount to pay.']]);
        }

        $taxReturn->loadMissing('rule');
        $payable = $this->taxAccount($taxReturn);
        $credit = $this->resolveAccount(
            $method === PaymentMethod::Cash ? config('finance.accounts.cash') : config('finance.accounts.bank')
        );
        $fiscalYear = $this->fiscalYearFor($date);

        DB::transaction(function () use ($taxReturn, $payable, $credit, $fiscalYear, $amount, $date, $userId, $memo) {
            $entry = JournalEntry::create([
                'institution_id' => $taxReturn->institution_id,
                'campus_id' => $taxReturn->campus_id,
                'fiscal_year_id' => $fiscalYear->id,
                'reference' => $this->journals->nextReference($fiscalYear->id, $fiscalYear->code),
                'entry_date' => $date,
                'status' => JournalStatus::Draft,
                'memo' => $memo ?? "Tax settlement {$taxReturn->reference}",
                'source_type' => $taxReturn->getMorphClass(),
                'source_id' => $taxReturn->id,
            ]);

            $entry->lines()->createMany([
                [
                    'chart_of_account_id' => $payable->id,
                    'line_no' => 1,
                    'description' => $taxReturn->rule?->name ?? $payable->name,
                    'debit' => $amount,
                    'credit' => 0,
                ],
                [
                    'chart_of_account_id' => $credit->id,
                    'line_no' => 2,
                    'description' => $credit->name,
                    'debit' => 0,
                    'credit' => $amount,
                ],
            ]);

            $this->journals->post($entry, $userId);

            $taxReturn->forceFill([
                'journal_entry_id' => $entry->id,
                'fiscal_year_id' => $fiscalYear->id,
                'status' => TaxReturnStatus::Paid,
                'paid_at' => now(),
            ])->save();
        });

        return $taxReturn->refresh()->load(['rule', 'documents', 'journalEntry']);
    }

    private function taxAccount(TaxReturn $taxReturn): ChartOfAccount
    {
        if ($taxReturn->rule?->tax_account_id !== null) {
            $account = ChartOfAccount::query()
                ->whereKey($taxReturn->rule->tax_account_id)
                ->where('is_group', false)
                ->first();

            if ($account !== null) {
                return $account;
            }
        }

        $code = $taxReturn->rule?->type === TaxType::Withholding
            ? config('finance.accounts.withholding_tax_payable')
            : config('finance.accounts.tax_payable');

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
