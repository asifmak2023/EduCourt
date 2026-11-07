<?php

namespace App\Services\Notifications\Gateways;

use App\Enums\ReminderChannel;
use App\Models\AppNotification;
use App\Services\Notifications\NotificationGateway;
use App\Services\WhatsApp\WhatsAppClient;
use Illuminate\Support\Facades\Log;

/**
 * Routes guardian notifications through the WhatsApp Cloud API. Notifications
 * on other channels (email/sms/in_app) fall back to the log driver so a single
 * gateway can serve every channel safely.
 */
class WhatsAppNotificationGateway implements NotificationGateway
{
    public function __construct(
        private readonly WhatsAppClient $client,
        private readonly ?NotificationGateway $fallback = null,
    ) {}

    public function send(AppNotification $notification): bool
    {
        if ($notification->channel !== ReminderChannel::WhatsApp) {
            return ($this->fallback ?? new LogNotificationGateway)->send($notification);
        }

        $recipient = $notification->recipient_phone;

        if ($recipient === null || trim($recipient) === '') {
            Log::warning('WhatsApp notification skipped: no recipient phone number.', [
                'notification_id' => $notification->id,
                'student_id' => $notification->student_id,
            ]);

            return false;
        }

        $body = trim(implode("\n\n", array_filter([
            $notification->title,
            $notification->body,
        ])));

        return $this->client->sendText($recipient, $body);
    }
}
