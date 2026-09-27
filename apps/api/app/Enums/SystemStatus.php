<?php

namespace App\Enums;

enum SystemStatus: string
{
    case Up = 'up';
    case Degraded = 'degraded';
    case Down = 'down';
    case Maintenance = 'maintenance';
}
