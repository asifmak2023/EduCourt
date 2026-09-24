<?php

namespace App\Enums;

enum CampusType: string
{
    case School = 'school';
    case College = 'college';
    case University = 'university';

    public function label(): string
    {
        return match ($this) {
            self::School => 'School',
            self::College => 'College',
            self::University => 'University',
        };
    }
}
