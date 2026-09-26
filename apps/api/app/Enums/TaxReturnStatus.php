<?php

namespace App\Enums;

enum TaxReturnStatus: string
{
    case Pending = 'pending';
    case Filed = 'filed';
    case Paid = 'paid';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Filed => 'Filed',
            self::Paid => 'Paid',
        };
    }
}
