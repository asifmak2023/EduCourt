<?php

namespace App\Enums;

enum ReevaluationStatus: string
{
    case Requested = 'requested';
    case UnderReview = 'under_review';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Completed = 'completed';
}
