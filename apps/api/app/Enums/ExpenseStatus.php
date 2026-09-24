<?php

namespace App\Enums;

enum ExpenseStatus: string
{
    case Draft = 'draft';
    case Approved = 'approved';
    case Partial = 'partial';
    case Paid = 'paid';
    case Void = 'void';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Approved => 'Approved',
            self::Partial => 'Partially Paid',
            self::Paid => 'Paid',
            self::Void => 'Void',
        };
    }
}
