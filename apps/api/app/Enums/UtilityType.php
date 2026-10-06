<?php

namespace App\Enums;

enum UtilityType: string
{
    case Electricity = 'electricity';
    case Gas = 'gas';
    case Telephone = 'telephone';
    case Internet = 'internet';
    case Water = 'water';
    case GeneratorFuel = 'generator_fuel';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::Electricity => 'Electricity',
            self::Gas => 'Gas',
            self::Telephone => 'Telephone',
            self::Internet => 'Internet',
            self::Water => 'Water',
            self::GeneratorFuel => 'Generator Fuel',
            self::Other => 'Other',
        };
    }
}
