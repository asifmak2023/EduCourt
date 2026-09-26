<?php

namespace App\Services\Reminders\Gateways;

use App\Models\FeeReminder;
use App\Services\Reminders\ReminderGateway;
use Illuminate\Support\Facades\Log;

/**
 * Default reminder driver. Records the delivery in the application log so the
 * reminder workflow can be exercised without an SMTP or SMS provider.
 */
class LogReminderGateway implements ReminderGateway
{
    public function send(FeeReminder $reminder): bool
    {
        Log::info('Fee reminder dispatched', [
            'reminder_id' => $reminder->id,
            'student_id' => $reminder->student_id,
            'channel' => $reminder->channel->value,
            'recipient' => $reminder->recipient_email ?? $reminder->recipient_phone,
            'outstanding' => (string) $reminder->outstanding,
        ]);

        return true;
    }
}
