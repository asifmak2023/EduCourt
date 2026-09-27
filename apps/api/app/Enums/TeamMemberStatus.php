<?php

namespace App\Enums;

enum TeamMemberStatus: string
{
    case Active = 'active';
    case Inactive = 'inactive';
    case Left = 'left';
}
