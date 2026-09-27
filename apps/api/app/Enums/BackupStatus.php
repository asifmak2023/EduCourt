<?php

namespace App\Enums;

enum BackupStatus: string
{
    case Success = 'success';
    case Partial = 'partial';
    case Failed = 'failed';
}
