<?php

namespace App\Enums;

enum BudgetPeriodType: string
{
    case Annual = 'annual';
    case SemiAnnual = 'semi_annual';
    case Quarterly = 'quarterly';
    case Monthly = 'monthly';

    public function label(): string
    {
        return match ($this) {
            self::Annual => 'Annual',
            self::SemiAnnual => 'Semi-annual',
            self::Quarterly => 'Quarterly',
            self::Monthly => 'Monthly',
        };
    }
}
