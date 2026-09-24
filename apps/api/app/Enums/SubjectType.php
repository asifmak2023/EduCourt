<?php

namespace App\Enums;

enum SubjectType: string
{
    case Core = 'core';
    case Elective = 'elective';
    case Optional = 'optional';

    public function label(): string
    {
        return match ($this) {
            self::Core => 'Core',
            self::Elective => 'Elective',
            self::Optional => 'Optional',
        };
    }
}
