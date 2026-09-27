<?php

namespace App\Enums;

enum CourseRegistrationStatus: string
{
    case Registered = 'registered';
    case Completed = 'completed';
    case Failed = 'failed';
    case Dropped = 'dropped';
}
