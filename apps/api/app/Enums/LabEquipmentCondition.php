<?php

namespace App\Enums;

enum LabEquipmentCondition: string
{
    case Working = 'working';
    case UnderRepair = 'under_repair';
    case Damaged = 'damaged';
    case Retired = 'retired';
}
