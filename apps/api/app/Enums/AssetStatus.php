<?php

namespace App\Enums;

enum AssetStatus: string
{
    case Active = 'active';
    case Disposed = 'disposed';
    case WrittenOff = 'written_off';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Disposed => 'Disposed',
            self::WrittenOff => 'Written Off',
        };
    }
}
