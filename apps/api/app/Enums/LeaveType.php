<?php

namespace App\Enums;

enum LeaveType: string
{
    case Sick = 'sick';
    case Casual = 'casual';
    case Annual = 'annual';
    case Maternity = 'maternity';
    case Unpaid = 'unpaid';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Sick => 'Sick Leave',
            self::Casual => 'Casual Leave',
            self::Annual => 'Annual Leave',
            self::Maternity => 'Maternity Leave',
            self::Unpaid => 'Unpaid Leave',
            self::Other => 'Other',
        };
    }
}
