<?php

namespace App\Services\Accounting;

use App\Enums\JournalStatus;
use App\Models\BankAccount;
use App\Models\JournalLine;
use Carbon\Carbon;

/**
 * Derives cash/bank book balances from the posted ledger. A cash or bank
 * account's balance is its opening balance plus the net movement of its linked
 * chart-of-accounts account.
 */
class BankReconciliationService
{
    /**
     * @return array{opening_balance: float, debit: float, credit: float, closing_balance: float}
     */
    public function bookBalance(BankAccount $account, string $asOfDate): array
    {
        $totals = JournalLine::query()
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->whereIn('journal_entries.status', [JournalStatus::Posted->value, JournalStatus::Reversed->value])
            ->where('journal_lines.chart_of_account_id', $account->chart_of_account_id)
            ->whereDate('journal_entries.entry_date', '<=', $asOfDate)
            ->selectRaw('COALESCE(SUM(journal_lines.debit), 0) as total_debit, COALESCE(SUM(journal_lines.credit), 0) as total_credit')
            ->first();

        $debit = (float) ($totals->total_debit ?? 0);
        $credit = (float) ($totals->total_credit ?? 0);
        $opening = (float) $account->opening_balance;

        return [
            'opening_balance' => round($opening, 2),
            'debit' => round($debit, 2),
            'credit' => round($credit, 2),
            'closing_balance' => round($opening + $debit - $credit, 2),
        ];
    }

    /**
     * @return array{opening_balance: float, closing_balance: float, lines: array<int, array<string, mixed>>}
     */
    public function statement(BankAccount $account, string $from, string $to): array
    {
        $opening = $this->bookBalance($account, Carbon::parse($from)->subDay()->toDateString())['closing_balance'];

        $rows = JournalLine::query()
            ->join('journal_entries', 'journal_entries.id', '=', 'journal_lines.journal_entry_id')
            ->whereIn('journal_entries.status', [JournalStatus::Posted->value, JournalStatus::Reversed->value])
            ->where('journal_lines.chart_of_account_id', $account->chart_of_account_id)
            ->whereDate('journal_entries.entry_date', '>=', $from)
            ->whereDate('journal_entries.entry_date', '<=', $to)
            ->orderBy('journal_entries.entry_date')
            ->orderBy('journal_lines.id')
            ->get([
                'journal_lines.id',
                'journal_lines.journal_entry_id',
                'journal_lines.description',
                'journal_lines.debit',
                'journal_lines.credit',
                'journal_entries.reference',
                'journal_entries.entry_date',
                'journal_entries.memo',
            ]);

        $balance = $opening;
        $lines = [];

        foreach ($rows as $row) {
            $debit = (float) $row->debit;
            $credit = (float) $row->credit;
            $balance = round($balance + $debit - $credit, 2);

            $lines[] = [
                'journal_entry_id' => $row->journal_entry_id,
                'date' => Carbon::parse($row->entry_date)->toDateString(),
                'reference' => $row->reference,
                'description' => $row->description,
                'memo' => $row->memo,
                'debit' => number_format($debit, 2, '.', ''),
                'credit' => number_format($credit, 2, '.', ''),
                'balance' => number_format($balance, 2, '.', ''),
            ];
        }

        return [
            'opening_balance' => $opening,
            'closing_balance' => $balance,
            'lines' => $lines,
        ];
    }
}
