<?php

namespace App\Enums;

enum TransportDirection: string
{
    case Pickup = 'pickup';
    case Drop = 'drop';
    case Both = 'both';
}
