<?php

namespace App\Enums;

/**
 * How a WhatsApp sender's credentials are managed.
 *
 * Ownership (whose brand the sender is) is a separate concept tracked by
 * owner_institution_id on the sender row. Managed-by only answers who may edit
 * the credentials.
 */
enum WhatsAppConnectionMode: string
{
    case PlatformManaged = 'platform_managed';
    case InstitutionManaged = 'institution_managed';
    case Disabled = 'disabled';

    public function label(): string
    {
        return match ($this) {
            self::PlatformManaged => 'Platform managed',
            self::InstitutionManaged => 'Institution managed',
            self::Disabled => 'Disabled',
        };
    }
}
