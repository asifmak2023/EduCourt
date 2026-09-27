<?php

namespace App\Enums;

enum HostelAllocationStatus: string
{
    case Allocated = 'allocated';
    case Notice = 'notice';
    case Vacated = 'vacated';
}
