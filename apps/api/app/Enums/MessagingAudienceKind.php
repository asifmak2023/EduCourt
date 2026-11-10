<?php

namespace App\Enums;

/**
 * The kind of a messaging audience.
 *
 * Meta's Cloud API has no native groups or broadcast lists; EduCourt models
 * them as audiences that resolve to individual recipients.
 */
enum MessagingAudienceKind: string
{
    case Group = 'group';
    case Broadcast = 'broadcast';

    public function label(): string
    {
        return match ($this) {
            self::Group => 'Group',
            self::Broadcast => 'Broadcast list',
        };
    }
}
