<?php

namespace App\Enums;

/**
 * Who may edit a sender's credentials.
 */
enum WhatsAppManagedBy: string
{
    case Platform = 'platform';
    case Institution = 'institution';

    public function label(): string
    {
        return match ($this) {
            self::Platform => 'Platform',
            self::Institution => 'Institution',
        };
    }
}
