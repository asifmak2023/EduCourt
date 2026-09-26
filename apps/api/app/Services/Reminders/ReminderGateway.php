<?php

namespace App\Services\Reminders;

use App\Models\FeeReminder;

interface ReminderGateway
{
    /**
     * Deliver a fee reminder and return true on success.
     */
    public function send(FeeReminder $reminder): bool;
}
