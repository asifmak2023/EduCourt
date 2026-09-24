<?php

namespace App\Enums;

enum LateFeeType: string
{
    case None = 'none';
    case Flat = 'flat';
    case Percent = 'percent';

    public function label(): string
    {
        return match ($this) {
            self::None => 'None',
            self::Flat => 'Flat amount',
            self::Percent => 'Percentage of voucher',
        };
    }
}
