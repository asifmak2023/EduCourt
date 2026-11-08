<?php

namespace App\Models;

use App\Enums\WhatsAppDeliveryStatus;
use App\Enums\WhatsAppMessageCategory;
use App\Enums\WhatsAppQuotaStatus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Quota and cost accounting for an outbound WhatsApp message attempt.
 *
 * delivery_intent_key is stable across retries; attempt_number increments per
 * submission. Quota is counted once per intent, never per attempt.
 */
class WhatsAppUsage extends Model
{
    use BelongsToInstitution, HasFactory, LogsActivity;

    protected $table = 'whatsapp_usage';

    protected $fillable = [
        'institution_id', 'sender_id', 'reminder_id', 'notification_id',
        'delivery_intent_key', 'attempt_number', 'idempotency_key',
        'provider_message_id', 'message_category', 'quota_status',
        'delivery_status', 'recipient', 'rate_card_id', 'estimated_cost',
        'estimated_currency', 'billed_cost', 'billed_currency', 'period',
        'submitted_at', 'delivered_at', 'read_at', 'failed_at',
    ];

    protected function casts(): array
    {
        return [
            'quota_status' => WhatsAppQuotaStatus::class,
            'delivery_status' => WhatsAppDeliveryStatus::class,
            'message_category' => WhatsAppMessageCategory::class,
            'attempt_number' => 'integer',
            'estimated_cost' => 'decimal:6',
            'billed_cost' => 'decimal:6',
            'submitted_at' => 'datetime',
            'delivered_at' => 'datetime',
            'read_at' => 'datetime',
            'failed_at' => 'datetime',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(WhatsAppSender::class, 'sender_id');
    }

    public function reminder(): BelongsTo
    {
        return $this->belongsTo(FeeReminder::class, 'reminder_id');
    }

    public function notification(): BelongsTo
    {
        return $this->belongsTo(AppNotification::class, 'notification_id');
    }

    public function rateCard(): BelongsTo
    {
        return $this->belongsTo(WhatsAppRateCard::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
