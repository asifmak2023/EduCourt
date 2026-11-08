<?php

namespace App\Enums;

/**
 * EduCourt's own messaging quota lifecycle, independent of Meta billing.
 */
enum WhatsAppQuotaStatus: string
{
    case Reserved = 'reserved';
    case Consumed = 'consumed';
    case Released = 'released';

    public function label(): string
    {
        return match ($this) {
            self::Reserved => 'Reserved',
            self::Consumed => 'Consumed',
            self::Released => 'Released',
        };
    }
}
