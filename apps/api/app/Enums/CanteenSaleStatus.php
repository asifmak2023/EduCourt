<?php

namespace App\Enums;

enum CanteenSaleStatus: string
{
    case Completed = 'completed';
    case Void = 'void';
}
