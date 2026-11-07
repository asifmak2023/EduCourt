<?php

namespace App\Enums;

enum ReminderChannel: string
{
    case Email = 'email';
    case Sms = 'sms';
    case WhatsApp = 'whatsapp';
    case InApp = 'in_app';

    public function label(): string
    {
        return match ($this) {
            self::Email => 'Email',
            self::Sms => 'SMS',
            self::WhatsApp => 'WhatsApp',
            self::InApp => 'In-app',
        };
    }

    /**
     * Whether this channel delivers to a phone number rather than an email.
     */
    public function usesPhone(): bool
    {
        return match ($this) {
            self::Sms, self::WhatsApp => true,
            self::Email, self::InApp => false,
        };
    }
}
