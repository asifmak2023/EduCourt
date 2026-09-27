<?php

namespace App\Enums;

enum ModerationStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Applied = 'applied';
    case Rejected = 'rejected';
}
