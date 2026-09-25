<?php

namespace App\Enums;

enum ScholarshipType: string
{
    case Merit = 'merit';
    case NeedBased = 'need_based';
    case Sports = 'sports';
    case Sibling = 'sibling';
    case StaffWard = 'staff_ward';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Merit => 'Merit',
            self::NeedBased => 'Need Based',
            self::Sports => 'Sports',
            self::Sibling => 'Sibling',
            self::StaffWard => 'Staff Ward',
            self::Other => 'Other',
        };
    }
}
