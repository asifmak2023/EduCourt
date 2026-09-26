<?php

namespace App\Services\Accounting;

use App\Enums\ExpenseStatus;
use App\Enums\JournalStatus;
use App\Enums\PaymentMethod;
use App\Models\ChartOfAccount;
use App\Models\Expense;
use App\Models\ExpensePayment;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\Vendor;
use App\Services\Approvals\ApprovalService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Posts vendor bills (expenses) and their settlements to the double-entry
 * ledger.
 *
 * Bill:      Dr each expense account   Cr Accounts Payable
 * Payment:   Dr Accounts Payable       Cr Cash/Bank
 */
class ExpenseService
{
    public function __construct(private readonly JournalService $journals) {}

    public function approve(Expense $expense, ?int $userId): Expense
    {
        if ($expense->status !== ExpenseStatus::Draft) {
            abort(409, 'Only draft expenses can be approved.');
        }

        $expense->loadMissing(['lines.category.expenseAccount', 'vendor']);

        $lines = $expense->lines;

        if ($lines->isEmpty()) {
            throw ValidationException::withMessages([
                'lines' => ['Add at least one expense line before approval.'],
            ]);
        }

        $grouped = [];

        foreach ($lines as $line) {
            $account = $line->category?->expenseAccount;

            if ($account === null) {
                throw ValidationException::withMessages([
                    'lines' => ["Expense category [{$line->category?->name}] has no expense account to post to."],
                ]);
            }

            $grouped[$account->id]['account'] = $account;
            $grouped[$account->id]['amount'] = round(($grouped[$account->id]['amount'] ?? 0) + (float) $line->amount, 2);
        }

        $total = round(array_sum(array_column($grouped, 'amount')), 2);

        if ($total <= 0) {
            throw ValidationException::withMessages([
                'lines' => ['The expense total must be greater than zero.'],
            ]);
        }

        app(ApprovalService::class)
            ->assertMayProceed($expense, 'expense', (int) $expense->campus_id, $total);

        $payable = $this->payableAccount($expense->vendor);
        $fiscalYear = $this->fiscalYearFor($expense->expense_date->toDateString());

        DB::transaction(function () use ($expense, $grouped, $payable, $total, $fiscalYear, $userId) {
            $entry = JournalEntry::create([
                'institution_id' => $expense->institution_id,
                'campus_id' => $expense->campus_id,
                'fiscal_year_id' => $fiscalYear->id,
                'reference' => $this->journals->nextReference($fiscalYear->id, $fiscalYear->code),
                'entry_date' => $expense->expense_date->toDateString(),
                'status' => JournalStatus::Draft,
                'memo' => "Expense {$expense->reference} approved",
                'source_type' => $expense->getMorphClass(),
                'source_id' => $expense->id,
            ]);

            $lineNo = 1;

            foreach ($grouped as $group) {
                $entry->lines()->create([
                    'chart_of_account_id' => $group['account']->id,
                    'line_no' => $lineNo++,
                    'description' => $group['account']->name,
                    'debit' => $group['amount'],
                    'credit' => 0,
                ]);
            }

            $entry->lines()->create([
                'chart_of_account_id' => $payable->id,
                'line_no' => $lineNo,
                'description' => $expense->vendor?->name ?? ($expense->payee_name ?? 'Accounts payable'),
                'debit' => 0,
                'credit' => $total,
            ]);

            $this->journals->post($entry, $userId);

            $expense->forceFill([
                'journal_entry_id' => $entry->id,
                'status' => ExpenseStatus::Approved,
                'total' => $total,
                'approved_by' => $userId,
                'approved_at' => now(),
            ])->save();
        });

        return $expense->refresh()->load('lines');
    }

    public function recordPayment(ExpensePayment $payment, ?int $userId): ExpensePayment
    {
        $payment->loadMissing('expense');

        $expense = $payment->expense;

        if ($expense === null) {
            throw ValidationException::withMessages([
                'expense_id' => ['The payment must reference an expense.'],
            ]);
        }

        if (! in_array($expense->status, [ExpenseStatus::Approved, ExpenseStatus::Partial], true)) {
            throw ValidationException::withMessages([
                'expense_id' => ['Only approved or partially paid expenses can receive payments.'],
            ]);
        }

        $amount = (float) $payment->amount;

        if ($amount <= 0) {
            throw ValidationException::withMessages(['amount' => ['The payment amount must be greater than zero.']]);
        }

        $outstanding = round((float) $expense->total - (float) $expense->paid_amount, 2);

        if ($amount > $outstanding + 0.005) {
            throw ValidationException::withMessages([
                'amount' => ["The amount exceeds the outstanding balance of {$outstanding}."],
            ]);
        }

        $payable = $this->payableAccount($expense->vendor);
        $credit = $this->resolveAccount($this->settlementAccountCode($payment->method));
        $fiscalYear = $this->fiscalYearFor($payment->payment_date->toDateString());

        DB::transaction(function () use ($payment, $expense, $payable, $credit, $fiscalYear, $userId) {
            $entry = JournalEntry::create([
                'institution_id' => $expense->institution_id,
                'campus_id' => $expense->campus_id,
                'fiscal_year_id' => $fiscalYear->id,
                'reference' => $this->journals->nextReference($fiscalYear->id, $fiscalYear->code),
                'entry_date' => $payment->payment_date->toDateString(),
                'status' => JournalStatus::Draft,
                'memo' => "Expense payment {$payment->reference}",
                'source_type' => $payment->getMorphClass(),
                'source_id' => $payment->id,
            ]);

            $entry->lines()->createMany([
                [
                    'chart_of_account_id' => $payable->id,
                    'line_no' => 1,
                    'description' => $expense->vendor?->name ?? 'Accounts payable',
                    'debit' => (float) $payment->amount,
                    'credit' => 0,
                ],
                [
                    'chart_of_account_id' => $credit->id,
                    'line_no' => 2,
                    'description' => $credit->name,
                    'debit' => 0,
                    'credit' => (float) $payment->amount,
                ],
            ]);

            $this->journals->post($entry, $userId);

            $payment->forceFill(['journal_entry_id' => $entry->id])->save();

            $this->recalculate($expense);
        });

        return $payment->refresh();
    }

    public function voidPayment(ExpensePayment $payment, ?int $userId, ?string $memo = null): ExpensePayment
    {
        if ($payment->isVoided()) {
            abort(409, 'The payment is already void.');
        }

        $payment->loadMissing('expense');

        DB::transaction(function () use ($payment, $userId, $memo) {
            if ($payment->journalEntry !== null) {
                $this->journals->reverse($payment->journalEntry, $userId, $memo);
            }

            $payment->forceFill(['voided_at' => now()])->save();

            if ($payment->expense !== null) {
                $this->recalculate($payment->expense);
            }
        });

        return $payment->refresh();
    }

    public function voidExpense(Expense $expense, ?int $userId, ?string $memo = null): Expense
    {
        if ($expense->status === ExpenseStatus::Void) {
            abort(409, 'The expense is already void.');
        }

        if ($expense->payments()->whereNull('voided_at')->exists()) {
            throw ValidationException::withMessages([
                'expense' => ['Void the payments on this expense before voiding it.'],
            ]);
        }

        DB::transaction(function () use ($expense, $userId, $memo) {
            if ($expense->journalEntry !== null) {
                $this->journals->reverse($expense->journalEntry, $userId, $memo);
            }

            $expense->forceFill(['status' => ExpenseStatus::Void])->save();
        });

        return $expense->refresh();
    }

    public function recalculate(Expense $expense): Expense
    {
        $paid = round((float) $expense->payments()->whereNull('voided_at')->sum('amount'), 2);

        $status = match (true) {
            $paid <= 0 => ExpenseStatus::Approved,
            $paid + 0.005 >= (float) $expense->total => ExpenseStatus::Paid,
            default => ExpenseStatus::Partial,
        };

        $expense->forceFill([
            'paid_amount' => $paid,
            'status' => $status,
        ])->save();

        return $expense;
    }

    private function payableAccount(?Vendor $vendor): ChartOfAccount
    {
        if ($vendor?->payable_account_id !== null) {
            $account = ChartOfAccount::query()
                ->whereKey($vendor->payable_account_id)
                ->where('is_group', false)
                ->first();

            if ($account !== null) {
                return $account;
            }
        }

        return $this->resolveAccount(config('finance.accounts.vendor_payable'));
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

    private function settlementAccountCode(PaymentMethod $method): string
    {
        return $method === PaymentMethod::Cash
            ? config('finance.accounts.cash')
            : config('finance.accounts.bank');
    }

    public function fiscalYearFor(string $date): FiscalYear
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

    public function nextReference(int $campusId): string
    {
        $sequence = Expense::withTrashed()->where('campus_id', $campusId)->count() + 1;

        do {
            $reference = sprintf('EXP-%06d', $sequence);
            $sequence++;
        } while (Expense::withTrashed()->where('campus_id', $campusId)->where('reference', $reference)->exists());

        return $reference;
    }

    public function nextPaymentReference(int $campusId): string
    {
        $sequence = ExpensePayment::withTrashed()->where('campus_id', $campusId)->count() + 1;

        do {
            $reference = sprintf('PV-%06d', $sequence);
            $sequence++;
        } while (ExpensePayment::withTrashed()->where('campus_id', $campusId)->where('reference', $reference)->exists());

        return $reference;
    }
}
