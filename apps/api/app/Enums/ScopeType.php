<?php

namespace App\Enums;

enum ScopeType: string
{
    case Institution = 'institution';
    case Campus = 'campus';
    case Department = 'department';
    case Stage = 'stage';
    case ClassRoom = 'class';

    public function label(): string
    {
        return match ($this) {
            self::Institution => 'Institution',
            self::Campus => 'Campus',
            self::Department => 'Department',
            self::Stage => 'Stage',
            self::ClassRoom => 'Class',
        };
    }
}
