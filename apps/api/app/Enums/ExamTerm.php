<?php

namespace App\Enums;

enum ExamTerm: string
{
    case First = 'first';
    case Second = 'second';
    case Third = 'third';
    case Final = 'final';
    case MonthlyTest = 'monthly_test';

    public function label(): string
    {
        return match ($this) {
            self::First => 'First Term',
            self::Second => 'Second Term',
            self::Third => 'Third Term',
            self::Final => 'Final Term',
            self::MonthlyTest => 'Monthly Test',
        };
    }
}
