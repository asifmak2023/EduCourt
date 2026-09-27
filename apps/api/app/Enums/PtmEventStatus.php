<?php

namespace App\Enums;

enum PtmEventStatus: string
{
    case Scheduled = 'scheduled';
    case Ongoing = 'ongoing';
    case Completed = 'completed';
    case Cancelled = 'cancelled';
}
