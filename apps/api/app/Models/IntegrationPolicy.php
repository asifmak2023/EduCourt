<?php

namespace App\Models;

use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Per-institution messaging policy and quota configuration.
 *
 * whatsapp_sender_id is the explicit sender assignment. When null the
 * institution cannot send WhatsApp messages; there is no implicit fallback.
 */
class IntegrationPolicy extends Model
{
    use BelongsToInstitution, HasFactory, LogsActivity;

    protected $fillable = [
        'institution_id', 'whatsapp_allowed', 'whatsapp_self_service',
        'whatsapp_sender_id', 'monthly_message_limit', 'warn_at_percent',
        'quota_timezone',
    ];

    protected function casts(): array
    {
        return [
            'whatsapp_allowed' => 'boolean',
            'whatsapp_self_service' => 'boolean',
            'monthly_message_limit' => 'integer',
            'warn_at_percent' => 'integer',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function whatsappSender(): BelongsTo
    {
        return $this->belongsTo(WhatsAppSender::class, 'whatsapp_sender_id');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'whatsapp_allowed', 'whatsapp_self_service', 'whatsapp_sender_id',
                'monthly_message_limit', 'warn_at_percent', 'quota_timezone',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }
}
