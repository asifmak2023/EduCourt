<?php

namespace App\Enums;

enum SalaryCalculation: string
{
    case Fixed = 'fixed';
    case PercentageOfBasic = 'percentage_of_basic';

    public function label(): string
    {
        return match ($this) {
            self::Fixed => 'Fixed Amount',
            self::PercentageOfBasic => 'Percentage of Basic',
        };
    }
}
