<?php

namespace App\Enums;

/**
 * A dynamic rule that expands an audience to recipients at send time.
 */
enum MessagingSegmentType: string
{
    case Section = 'section';
    case ClassRoom = 'class_room';
    case Role = 'role';
    case Campus = 'campus';

    public function label(): string
    {
        return match ($this) {
            self::Section => 'Section',
            self::ClassRoom => 'Class',
            self::Role => 'Role',
            self::Campus => 'Campus',
        };
    }
}
