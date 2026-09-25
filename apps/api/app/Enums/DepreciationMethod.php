<?php

namespace App\Enums;

enum DepreciationMethod: string
{
    case None = 'none';
    case StraightLine = 'straight_line';

    public function label(): string
    {
        return match ($this) {
            self::None => 'No Depreciation',
            self::StraightLine => 'Straight Line',
        };
    }
}
