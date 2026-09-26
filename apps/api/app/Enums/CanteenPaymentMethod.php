<?php

namespace App\Enums;

enum CanteenPaymentMethod: string
{
    case Cash = 'cash';
    case Wallet = 'wallet';
    case Credit = 'credit';

    public function label(): string
    {
        return match ($this) {
            self::Cash => 'Cash',
            self::Wallet => 'Wallet',
            self::Credit => 'Credit',
        };
    }
}
