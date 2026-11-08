<?php

namespace App\Enums;

/**
 * Guardian consent state for a message category.
 */
enum WhatsAppConsentStatus: string
{
    case Pending = 'pending';
    case OptedIn = 'opted_in';
    case OptedOut = 'opted_out';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pending',
            self::OptedIn => 'Opted in',
            self::OptedOut => 'Opted out',
        };
    }
}
