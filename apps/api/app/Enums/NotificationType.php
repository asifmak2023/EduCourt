<?php

namespace App\Enums;

enum NotificationType: string
{
    case Absence = 'absence';
    case FeeReminder = 'fee_reminder';
    case General = 'general';

    public function label(): string
    {
        return match ($this) {
            self::Absence => 'Absence',
            self::FeeReminder => 'Fee Reminder',
            self::General => 'General',
        };
    }
}
