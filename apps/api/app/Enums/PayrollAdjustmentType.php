<?php

namespace App\Enums;

enum PayrollAdjustmentType: string
{
    case Incentive = 'incentive';
    case Reward = 'reward';
    case Bonus = 'bonus';
    case Overtime = 'overtime';
    case Deduction = 'deduction';

    public function label(): string
    {
        return match ($this) {
            self::Incentive => 'Incentive',
            self::Reward => 'Reward',
            self::Bonus => 'Bonus',
            self::Overtime => 'Overtime',
            self::Deduction => 'Deduction',
        };
    }

    public function isEarning(): bool
    {
        return $this !== self::Deduction;
    }
}
