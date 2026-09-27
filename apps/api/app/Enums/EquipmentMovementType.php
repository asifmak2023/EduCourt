<?php

namespace App\Enums;

enum EquipmentMovementType: string
{
    case Purchase = 'purchase';
    case Issue = 'issue';
    case Return = 'return';
    case Adjustment = 'adjustment';
    case Damage = 'damage';
}
