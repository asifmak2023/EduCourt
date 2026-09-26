<?php

namespace App\Services\Notifications\Gateways;

use App\Models\AppNotification;
use App\Services\Notifications\NotificationGateway;
use Illuminate\Support\Facades\Log;

/**
 * Default notification driver. Writes the delivery to the application log so
 * the notification workflow works without an SMTP or SMS provider.
 */
class LogNotificationGateway implements NotificationGateway
{
    public function send(AppNotification $notification): bool
    {
        Log::info('Notification dispatched', [
            'notification_id' => $notification->id,
            'type' => $notification->type->value,
            'channel' => $notification->channel->value,
            'recipient' => $notification->recipient_email ?? $notification->recipient_phone,
        ]);

        return true;
    }
}
