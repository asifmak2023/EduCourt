<?php

namespace App\Enums;

enum FineStatus: string
{
    case Pending = 'pending';
    case Applied = 'applied';
    case Waived = 'waived';
    case Revoked = 'revoked';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::Applied => 'Applied',
            self::Waived => 'Waived',
            self::Revoked => 'Revoked',
        };
    }
}
