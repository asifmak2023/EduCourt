<?php

namespace App\Enums;

/**
 * Whether a sender's access token has a known expiry.
 *
 * A null expiry date is ambiguous on its own, so the mode disambiguates:
 * "never" means explicitly no expiry, "unknown" means we were not told.
 */
enum WhatsAppTokenExpiryMode: string
{
    case Known = 'known';
    case Never = 'never';
    case Unknown = 'unknown';

    public function label(): string
    {
        return match ($this) {
            self::Known => 'Known expiry',
            self::Never => 'No expiry',
            self::Unknown => 'Unknown',
        };
    }
}
