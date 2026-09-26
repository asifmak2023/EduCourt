<?php

namespace App\Enums;

enum ConductCategory: string
{
    case Discipline = 'discipline';
    case Academic = 'academic';
    case Participation = 'participation';
    case Uniform = 'uniform';
    case Bullying = 'bullying';
    case Achievement = 'achievement';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Discipline => 'Discipline',
            self::Academic => 'Academic',
            self::Participation => 'Participation',
            self::Uniform => 'Uniform',
            self::Bullying => 'Bullying',
            self::Achievement => 'Achievement',
            self::Other => 'Other',
        };
    }

    /**
     * Whether the record reflects a positive behaviour.
     */
    public function isPositive(): bool
    {
        return $this === self::Achievement;
    }
}
