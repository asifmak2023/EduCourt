<?php

namespace App\Enums;

enum AccountingPeriodStatus: string
{
    case Open = 'open';
    case Closed = 'closed';
    case Locked = 'locked';

    public function label(): string
    {
        return match ($this) {
            self::Open => 'Open',
            self::Closed => 'Closed',
            self::Locked => 'Locked',
        };
    }

    public function isOpen(): bool
    {
        return $this === self::Open;
    }
}
