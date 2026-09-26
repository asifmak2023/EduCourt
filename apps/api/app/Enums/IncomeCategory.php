<?php

namespace App\Enums;

enum IncomeCategory: string
{
    case Donation = 'donation';
    case Sale = 'sale';
    case Commission = 'commission';
    case ExamFee = 'exam_fee';
    case Charge = 'charge';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Donation => 'Donation',
            self::Sale => 'Sale',
            self::Commission => 'Commission',
            self::ExamFee => 'Exam Fee',
            self::Charge => 'Charge',
            self::Other => 'Other',
        };
    }

    public function defaultAccountCode(): string
    {
        return match ($this) {
            self::Donation => '4060',
            self::Sale => '4070',
            self::Commission => '4080',
            self::ExamFee => '4090',
            self::Charge, self::Other => '4040',
        };
    }
}
