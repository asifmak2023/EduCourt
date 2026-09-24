<?php

namespace App\Enums;

enum BankAccountType: string
{
    case Bank = 'bank';
    case Cash = 'cash';
    case PettyCash = 'petty_cash';
    case MobileWallet = 'mobile_wallet';

    public function label(): string
    {
        return match ($this) {
            self::Bank => 'Bank Account',
            self::Cash => 'Cash',
            self::PettyCash => 'Petty Cash',
            self::MobileWallet => 'Mobile Wallet',
        };
    }
}
