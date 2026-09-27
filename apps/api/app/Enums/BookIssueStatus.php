<?php

namespace App\Enums;

enum BookIssueStatus: string
{
    case Issued = 'issued';
    case Returned = 'returned';
    case Overdue = 'overdue';
    case Lost = 'lost';
}
