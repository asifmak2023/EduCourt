<?php

namespace App\Services\Notifications\Gateways;

use App\Enums\ReminderChannel;
use App\Models\AppNotification;
use App\Services\Notifications\NotificationGateway;
use App\Services\WhatsApp\WhatsAppDeliveryService;

/**
 * Routes guardian notifications through the per-institution WhatsApp delivery
 * service. Notifications on other channels fall back to the log driver.
 */
class WhatsAppNotificationGateway implements NotificationGateway
{
    public function __construct(
        private readonly WhatsAppDeliveryService $delivery,
        private readonly ?NotificationGateway $fallback = null,
    ) {}

    public function send(AppNotification $notification): bool
    {
        if ($notification->channel !== ReminderChannel::WhatsApp) {
            return ($this->fallback ?? new LogNotificationGateway)->send($notification);
        }

        return $this->delivery->sendNotification($notification);
    }
}
