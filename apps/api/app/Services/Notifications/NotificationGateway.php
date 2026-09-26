<?php

namespace App\Services\Notifications;

use App\Models\AppNotification;

interface NotificationGateway
{
    /**
     * Deliver a notification and return true on success.
     */
    public function send(AppNotification $notification): bool;
}
