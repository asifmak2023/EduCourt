<?php

namespace App\Enums;

enum StaffStatus: string
{
    case Active = 'active';
    case Probation = 'probation';
    case OnLeave = 'on_leave';
    case Resigned = 'resigned';
    case Terminated = 'terminated';
    case Retired = 'retired';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Probation => 'Probation',
            self::OnLeave => 'On Leave',
            self::Resigned => 'Resigned',
            self::Terminated => 'Terminated',
            self::Retired => 'Retired',
        };
    }

    public function isEmployed(): bool
    {
        return in_array($this, [self::Active, self::Probation, self::OnLeave], true);
    }
}
