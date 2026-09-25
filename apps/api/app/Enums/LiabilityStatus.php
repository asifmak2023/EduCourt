<?php

namespace App\Enums;

enum LiabilityStatus: string
{
    case Active = 'active';
    case Settled = 'settled';
    case WrittenOff = 'written_off';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Settled => 'Settled',
            self::WrittenOff => 'Written Off',
        };
    }
}
