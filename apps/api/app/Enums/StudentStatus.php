<?php

namespace App\Enums;

enum StudentStatus: string
{
    case Active = 'active';
    case Inactive = 'inactive';
    case Withdrawn = 'withdrawn';
    case Transferred = 'transferred';
    case Graduated = 'graduated';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Inactive => 'Inactive',
            self::Withdrawn => 'Withdrawn',
            self::Transferred => 'Transferred',
            self::Graduated => 'Graduated',
        };
    }
}
