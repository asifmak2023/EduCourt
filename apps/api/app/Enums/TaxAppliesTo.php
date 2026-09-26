<?php

namespace App\Enums;

enum TaxAppliesTo: string
{
    case Fee = 'fee';
    case Expense = 'expense';
    case OtherIncome = 'other_income';
    case All = 'all';

    public function label(): string
    {
        return match ($this) {
            self::Fee => 'Fees',
            self::Expense => 'Expenses',
            self::OtherIncome => 'Other Income',
            self::All => 'All',
        };
    }
}
