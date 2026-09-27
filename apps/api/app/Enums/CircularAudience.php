<?php

namespace App\Enums;

enum CircularAudience: string
{
    case All = 'all';
    case Students = 'students';
    case Parents = 'parents';
    case Staff = 'staff';
    case ClassWise = 'class';
}
