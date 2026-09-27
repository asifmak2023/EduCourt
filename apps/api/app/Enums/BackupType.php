<?php

namespace App\Enums;

enum BackupType: string
{
    case Database = 'database';
    case Files = 'files';
    case Server = 'server';
    case Config = 'config';
}
