<?php

namespace App\Services\Accounting;

use App\Enums\JournalStatus;
use App\Models\JournalEntry;
use App\Models\JournalLine;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Owns the double-entry invariants: a journal entry must balance before it is
 * posted, and posted entries are corrected only by reversal.
 */
class JournalService
{
    private const TOLERANCE = 0.005;

    public function nextReference(int $fiscalYearId, string $code): string
    {
        $sequence = JournalEntry::query()
            ->where('fiscal_year_id', $fiscalYearId)
            ->withTrashed()
            ->count() + 1;

        return sprintf('JV/%s/%04d', $code, $sequence);
    }

    public function post(JournalEntry $entry, ?int $userId): JournalEntry
    {
        if (! $entry->isDraft()) {
            abort(409, 'Only draft journal entries can be posted.');
        }

        $lines = $entry->lines()->get();
        $this->assertBalanced($lines);

        return DB::transaction(function () use ($entry, $lines, $userId) {
            $entry->forceFill([
                'status' => JournalStatus::Posted,
                'posted_at' => now(),
                'posted_by' => $userId,
                'total_debit' => $lines->sum(fn (JournalLine $line) => (float) $line->debit),
                'total_credit' => $lines->sum(fn (JournalLine $line) => (float) $line->credit),
            ])->save();

            return $entry->refresh()->load('lines.account');
        });
    }

    public function reverse(JournalEntry $entry, ?int $userId, ?string $memo = null): JournalEntry
    {
        if (! $entry->isPosted()) {
            abort(409, 'Only posted journal entries can be reversed.');
        }

        return DB::transaction(function () use ($entry, $userId, $memo) {
            $reversal = JournalEntry::create([
                'institution_id' => $entry->institution_id,
                'campus_id' => $entry->campus_id,
                'fiscal_year_id' => $entry->fiscal_year_id,
                'reference' => $this->nextReference($entry->fiscal_year_id, $entry->fiscalYear->code),
                'entry_date' => now()->toDateString(),
                'status' => JournalStatus::Draft,
                'memo' => $memo ?? "Reversal of {$entry->reference}",
                'reversal_of_id' => $entry->id,
            ]);

            foreach ($entry->lines as $index => $line) {
                $reversal->lines()->create([
                    'chart_of_account_id' => $line->chart_of_account_id,
                    'line_no' => $index + 1,
                    'description' => $line->description,
                    'debit' => $line->credit,
                    'credit' => $line->debit,
                ]);
            }

            $this->post($reversal, $userId);

            $entry->forceFill([
                'status' => JournalStatus::Reversed,
                'reversed_by_id' => $userId,
            ])->save();

            return $reversal->refresh()->load('lines.account');
        });
    }

    /**
     * @param  Collection<int, JournalLine>  $lines
     */
    public function assertBalanced(Collection $lines): void
    {
        if ($lines->count() < 2) {
            throw ValidationException::withMessages([
                'lines' => ['A journal entry needs at least two lines.'],
            ]);
        }

        $debit = 0.0;
        $credit = 0.0;

        foreach ($lines as $line) {
            $lineDebit = (float) $line->debit;
            $lineCredit = (float) $line->credit;

            if ($lineDebit < 0 || $lineCredit < 0) {
                throw ValidationException::withMessages([
                    'lines' => ['Line amounts cannot be negative.'],
                ]);
            }

            if ($lineDebit > 0 && $lineCredit > 0) {
                throw ValidationException::withMessages([
                    'lines' => ['A line must be either a debit or a credit, not both.'],
                ]);
            }

            if ($lineDebit <= 0 && $lineCredit <= 0) {
                throw ValidationException::withMessages([
                    'lines' => ['Each line needs a debit or a credit amount.'],
                ]);
            }

            $debit += $lineDebit;
            $credit += $lineCredit;
        }

        if ($debit <= 0) {
            throw ValidationException::withMessages([
                'lines' => ['A journal entry must have a value greater than zero.'],
            ]);
        }

        if (abs($debit - $credit) > self::TOLERANCE) {
            throw ValidationException::withMessages([
                'lines' => ["The entry is not balanced: debits {$debit} do not equal credits {$credit}."],
            ]);
        }
    }
}
