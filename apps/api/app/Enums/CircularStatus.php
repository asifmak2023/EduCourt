<?php

namespace App\Enums;

enum CircularStatus: string
{
    case Draft = 'draft';
    case Published = 'published';
    case Archived = 'archived';
}
