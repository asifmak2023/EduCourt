<?php

namespace App\Enums;

enum ChangeStatus: string
{
    case Draft = 'draft';
    case Submitted = 'submitted';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Implemented = 'implemented';
}
