<?php

namespace App\Models;

use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Per-campus messaging policy: sender assignment, optional quota and the
 * campus self-service toggle.
 *
 * The institution policy remains the tenant kill-switch and master quota.
 */
class CampusIntegrationPolicy extends Model
{
    use BelongsToInstitution, HasFactory, LogsActivity;

    protected $table = 'campus_integration_policies';

    protected $fillable = [
        'institution_id', 'campus_id', 'whatsapp_enabled',
        'whatsapp_self_service', 'whatsapp_sender_id', 'monthly_message_limit',
    ];

    protected function casts(): array
    {
        return [
            'whatsapp_enabled' => 'boolean',
            'whatsapp_self_service' => 'boolean',
            'monthly_message_limit' => 'integer',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function campus(): BelongsTo
    {
        return $this->belongsTo(Campus::class);
    }

    public function whatsappSender(): BelongsTo
    {
        return $this->belongsTo(WhatsAppSender::class, 'whatsapp_sender_id');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'whatsapp_enabled', 'whatsapp_self_service',
                'whatsapp_sender_id', 'monthly_message_limit',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }
}
