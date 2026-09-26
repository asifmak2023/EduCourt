<?php

namespace App\Enums;

enum FineCategory: string
{
    case Library = 'library';
    case Lab = 'lab';
    case Discipline = 'discipline';
    case LatePayment = 'late_payment';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Library => 'Library',
            self::Lab => 'Laboratory',
            self::Discipline => 'Discipline',
            self::LatePayment => 'Late Payment',
            self::Other => 'Other',
        };
    }
}
