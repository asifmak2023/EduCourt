<?php

namespace App\Enums;

enum HygieneStatus: string
{
    case Pass = 'pass';
    case NeedsAttention = 'needs_attention';
    case Fail = 'fail';
}
