<?php

namespace App\Enums;

enum PayeeType: string
{
    case Staff = 'staff';
    case Vendor = 'vendor';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Staff => 'Staff',
            self::Vendor => 'Vendor',
            self::Other => 'Other',
        };
    }
}
