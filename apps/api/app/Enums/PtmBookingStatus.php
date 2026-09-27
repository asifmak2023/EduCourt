<?php

namespace App\Enums;

enum PtmBookingStatus: string
{
    case Booked = 'booked';
    case Cancelled = 'cancelled';
    case Attended = 'attended';
    case NoShow = 'no_show';
}
