<?php

namespace App\Enums;

enum WelfareRecordType: string
{
    case Health = 'health';
    case Medical = 'medical';
    case Welfare = 'welfare';
    case Incident = 'incident';
}
