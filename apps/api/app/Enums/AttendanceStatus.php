<?php

namespace App\Enums;

enum AttendanceStatus: string
{
    case Present = 'present';
    case Absent = 'absent';
    case Late = 'late';
    case Leave = 'leave';
    case Excused = 'excused';

    public function label(): string
    {
        return match ($this) {
            self::Present => 'Present',
            self::Absent => 'Absent',
            self::Late => 'Late',
            self::Leave => 'Leave',
            self::Excused => 'Excused',
        };
    }

    /**
     * Statuses that count towards the present tally in reports.
     */
    public function isPresentLike(): bool
    {
        return in_array($this, [self::Present, self::Late], true);
    }
}
