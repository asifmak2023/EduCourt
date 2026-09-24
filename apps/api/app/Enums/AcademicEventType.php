<?php

namespace App\Enums;

enum AcademicEventType: string
{
    case Holiday = 'holiday';
    case Exam = 'exam';
    case Event = 'event';
    case Meeting = 'meeting';

    public function label(): string
    {
        return match ($this) {
            self::Holiday => 'Holiday',
            self::Exam => 'Exam',
            self::Event => 'Event',
            self::Meeting => 'Meeting',
        };
    }
}
