<?php

namespace App\Enums;

enum PaymentVoucherCategory: string
{
    case StaffSalary = 'staff_salary';
    case Utility = 'utility';
    case Purchase = 'purchase';
    case Other = 'other';
    case Legacy = 'legacy';

    public function label(): string
    {
        return match ($this) {
            self::StaffSalary => 'Staff Salary',
            self::Utility => 'Utility',
            self::Purchase => 'Purchase',
            self::Other => 'Other Payment',
            self::Legacy => 'Legacy Expense',
        };
    }

    public function prefix(): string
    {
        return match ($this) {
            self::StaffSalary => 'SAL',
            self::Utility => 'UTL',
            self::Purchase => 'PUR',
            self::Other => 'OTH',
            self::Legacy => 'EXP',
        };
    }

    public function isSalary(): bool
    {
        return $this === self::StaffSalary;
    }
}
