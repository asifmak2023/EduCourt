<?php

namespace App\Enums;

enum EnrollmentStatus: string
{
    case Active = 'active';
    case Promoted = 'promoted';
    case Repeated = 'repeated';
    case Withdrawn = 'withdrawn';
    case Transferred = 'transferred';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Promoted => 'Promoted',
            self::Repeated => 'Repeated',
            self::Withdrawn => 'Withdrawn',
            self::Transferred => 'Transferred',
        };
    }
}
