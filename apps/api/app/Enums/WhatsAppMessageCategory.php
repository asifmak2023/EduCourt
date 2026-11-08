<?php

namespace App\Enums;

/**
 * WhatsApp message categories from Meta's pricing model.
 */
enum WhatsAppMessageCategory: string
{
    case Marketing = 'marketing';
    case Utility = 'utility';
    case Authentication = 'authentication';
    case Service = 'service';

    public function label(): string
    {
        return match ($this) {
            self::Marketing => 'Marketing',
            self::Utility => 'Utility',
            self::Authentication => 'Authentication',
            self::Service => 'Service',
        };
    }
}
