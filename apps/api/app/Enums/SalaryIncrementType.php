<?php

namespace App\Enums;

enum SalaryIncrementType: string
{
    case Percent = 'percent';
    case Fixed = 'fixed';

    public function label(): string
    {
        return match ($this) {
            self::Percent => 'Percentage of basic',
            self::Fixed => 'Fixed amount',
        };
    }

    /**
     * Resolves the new basic salary after applying this increment.
     */
    public function applyTo(float $basic, float $value): float
    {
        $next = $this === self::Percent
            ? $basic + ($basic * $value / 100)
            : $basic + $value;

        return round(max(0, $next), 2);
    }
}
