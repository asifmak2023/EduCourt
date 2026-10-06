<?php

namespace App\Enums;

enum BillingKind: string
{
    case Monthly = 'monthly';
    case Exam = 'exam';
    case OneTime = 'one_time';
    case Other = 'other';
    case LegacyInstallment = 'legacy_installment';

    public function label(): string
    {
        return match ($this) {
            self::Monthly => 'Monthly Fee',
            self::Exam => 'Examination Fee',
            self::OneTime => 'One-time Fee',
            self::Other => 'Other Charge',
            self::LegacyInstallment => 'Legacy Installment',
        };
    }
}
