<?php

namespace App\Enums;

enum SupplementaryStatus: string
{
    case Registered = 'registered';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Completed = 'completed';
}
