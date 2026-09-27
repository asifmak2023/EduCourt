<?php

namespace App\Enums;

enum FixtureStatus: string
{
    case Scheduled = 'scheduled';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
}
