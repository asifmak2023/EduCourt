<?php

namespace App\Enums;

/**
 * Provider delivery state for a WhatsApp message.
 *
 * "submitted" is not "sent": the Cloud API accepting a request does not prove
 * the message reached the handset. submission_unknown covers the ambiguous case
 * where a request may have been written before a network timeout; it must never
 * be retried blindly.
 */
enum WhatsAppDeliveryStatus: string
{
    case Queued = 'queued';
    case Reserved = 'reserved';
    case Submitted = 'submitted';
    case Accepted = 'accepted';
    case Sent = 'sent';
    case Delivered = 'delivered';
    case Read = 'read';
    case Failed = 'failed';
    case SubmissionUnknown = 'submission_unknown';
    case Skipped = 'skipped';

    public function label(): string
    {
        return match ($this) {
            self::Queued => 'Queued',
            self::Reserved => 'Quota reserved',
            self::Submitted => 'Submitted to WhatsApp',
            self::Accepted => 'Accepted by WhatsApp',
            self::Sent => 'Sent',
            self::Delivered => 'Delivered',
            self::Read => 'Read',
            self::Failed => 'Failed',
            self::SubmissionUnknown => 'Delivery status unknown',
            self::Skipped => 'Skipped',
        };
    }

    /**
     * Monotonic rank used to ignore out-of-order webhook events.
     */
    public function rank(): int
    {
        return match ($this) {
            self::Queued => 0,
            self::Reserved => 1,
            self::Submitted => 2,
            self::Accepted => 3,
            self::Sent => 4,
            self::Delivered => 5,
            self::Read => 6,
            self::Failed, self::SubmissionUnknown, self::Skipped => 0,
        };
    }
}
