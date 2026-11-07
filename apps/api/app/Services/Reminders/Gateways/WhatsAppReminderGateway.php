<?php

namespace App\Services\Reminders\Gateways;

use App\Enums\ReminderChannel;
use App\Models\FeeReminder;
use App\Services\Reminders\ReminderGateway;
use App\Services\WhatsApp\WhatsAppClient;
use Illuminate\Support\Facades\Log;

/**
 * Routes fee reminders through the WhatsApp Cloud API. Reminders queued on
 * other channels (email/sms/in_app) fall back to the log driver so a single
 * gateway can serve every channel safely.
 */
class WhatsAppReminderGateway implements ReminderGateway
{
    public function __construct(
        private readonly WhatsAppClient $client,
        private readonly ?ReminderGateway $fallback = null,
    ) {}

    public function send(FeeReminder $reminder): bool
    {
        if ($reminder->channel !== ReminderChannel::WhatsApp) {
            return ($this->fallback ?? new LogReminderGateway)->send($reminder);
        }

        $recipient = $reminder->recipient_phone;

        if ($recipient === null || trim($recipient) === '') {
            Log::warning('WhatsApp reminder skipped: no recipient phone number.', [
                'reminder_id' => $reminder->id,
                'student_id' => $reminder->student_id,
            ]);

            return false;
        }

        return $this->client->sendText($recipient, (string) $reminder->message);
    }
}
