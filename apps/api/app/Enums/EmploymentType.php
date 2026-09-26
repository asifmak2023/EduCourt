<?php

namespace App\Enums;

enum EmploymentType: string
{
    case Permanent = 'permanent';
    case Contract = 'contract';
    case PartTime = 'part_time';
    case Visiting = 'visiting';
    case Intern = 'intern';

    public function label(): string
    {
        return match ($this) {
            self::Permanent => 'Permanent',
            self::Contract => 'Contract',
            self::PartTime => 'Part Time',
            self::Visiting => 'Visiting',
            self::Intern => 'Intern',
        };
    }
}
