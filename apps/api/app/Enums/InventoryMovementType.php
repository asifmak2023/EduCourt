<?php

namespace App\Enums;

enum InventoryMovementType: string
{
    case Purchase = 'purchase';
    case Issue = 'issue';
    case Return = 'return';
    case Adjustment = 'adjustment';
    case Wastage = 'wastage';
}
