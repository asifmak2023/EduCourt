<?php

namespace App\Enums;

enum ExamStatus: string
{
    case Scheduled = 'scheduled';
    case Ongoing = 'ongoing';
    case Completed = 'completed';
    case Published = 'published';

    public function label(): string
    {
        return match ($this) {
            self::Scheduled => 'Scheduled',
            self::Ongoing => 'Ongoing',
            self::Completed => 'Completed',
            self::Published => 'Published',
        };
    }
}
