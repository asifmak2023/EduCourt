<?php

namespace App\Services\Accounting;

use App\Enums\AccountingPeriodStatus;
use App\Models\AccountingPeriod;
use Carbon\CarbonInterface;
use Illuminate\Validation\ValidationException;

/**
 * Guards posting against closed or locked accounting periods. When a campus has
 * not defined any periods the check is a no-op, so ledgers remain usable without
 * an explicit period setup.
 */
class PeriodLockService
{
    public function periodFor(int $fiscalYearId, CarbonInterface|string $date): ?AccountingPeriod
    {
        $on = $date instanceof CarbonInterface ? $date->toDateString() : $date;

        return AccountingPeriod::query()
            ->where('fiscal_year_id', $fiscalYearId)
            ->whereDate('starts_on', '<=', $on)
            ->whereDate('ends_on', '>=', $on)
            ->first();
    }

    public function assertOpen(int $fiscalYearId, CarbonInterface|string $date): void
    {
        $period = $this->periodFor($fiscalYearId, $date);

        if ($period === null || $period->isOpen()) {
            return;
        }

        throw ValidationException::withMessages([
            'entry_date' => [
                "The accounting period {$period->name} is {$period->status->label()} and cannot accept postings.",
            ],
        ]);
    }

    public function isOpen(int $fiscalYearId, CarbonInterface|string $date): bool
    {
        $period = $this->periodFor($fiscalYearId, $date);

        return $period === null || $period->status === AccountingPeriodStatus::Open;
    }
}
