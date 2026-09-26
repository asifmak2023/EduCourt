<?php

namespace App\Enums;

enum ConcessionType: string
{
    case Sibling = 'sibling';
    case StaffWard = 'staff_ward';
    case NeedBased = 'need_based';
    case Category = 'category';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Sibling => 'Sibling',
            self::StaffWard => 'Staff Ward',
            self::NeedBased => 'Need Based',
            self::Category => 'Category',
            self::Other => 'Other',
        };
    }
}
