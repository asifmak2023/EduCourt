<?php

namespace App\Enums;

enum LiabilityType: string
{
    case Loan = 'loan';
    case Mortgage = 'mortgage';
    case Payable = 'payable';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Loan => 'Loan',
            self::Mortgage => 'Mortgage',
            self::Payable => 'Payable',
            self::Other => 'Other',
        };
    }
}
