<?php

namespace App\Enums;

enum InvigilationRole: string
{
    case Chief = 'chief';
    case Assistant = 'assistant';

    public function label(): string
    {
        return match ($this) {
            self::Chief => 'Chief',
            self::Assistant => 'Assistant',
        };
    }
}
