<?php

namespace App\Services\Reminders\Gateways;

use App\Enums\ReminderChannel;
use App\Models\FeeReminder;
use App\Services\Reminders\ReminderGateway;
use App\Services\WhatsApp\WhatsAppDeliveryService;

/**
 * Routes fee reminders through the per-institution WhatsApp delivery service.
 * Reminders on other channels fall back to the log driver.
 */
class WhatsAppReminderGateway implements ReminderGateway
{
    public function __construct(
        private readonly WhatsAppDeliveryService $delivery,
        private readonly ?ReminderGateway $fallback = null,
    ) {}

    public function send(FeeReminder $reminder): bool
    {
        if ($reminder->channel !== ReminderChannel::WhatsApp) {
            return ($this->fallback ?? new LogReminderGateway)->send($reminder);
        }

        return $this->delivery->sendReminder($reminder);
    }
}
