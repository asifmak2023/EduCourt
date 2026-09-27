<?php

namespace App\Enums;

enum ItAssetStatus: string
{
    case Available = 'available';
    case Assigned = 'assigned';
    case Repair = 'repair';
    case Retired = 'retired';
}
