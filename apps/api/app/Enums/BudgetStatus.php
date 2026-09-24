<?php

namespace App\Enums;

enum BudgetStatus: string
{
    case Draft = 'draft';
    case Approved = 'approved';
    case Closed = 'closed';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draft',
            self::Approved => 'Approved',
            self::Closed => 'Closed',
        };
    }
}
