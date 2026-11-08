<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A raw provider event: inbound message or delivery receipt.
 *
 * Message content is intentionally not retained; only metadata needed for the
 * 24-hour window and delivery status.
 */
class WhatsAppMessageEvent extends Model
{
    use HasFactory;

    protected $table = 'whatsapp_message_events';

    protected $fillable = [
        'integration_id', 'institution_id', 'contact_wa_id',
        'provider_message_id', 'direction', 'event', 'event_meta', 'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'event_meta' => 'array',
            'occurred_at' => 'datetime',
        ];
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(WhatsAppSender::class, 'integration_id');
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Whether the 24-hour customer service window is open for this sender and
     * recipient, derived from the latest inbound message.
     */
    public static function windowOpen(int $integrationId, string $contactWaId, ?int $withinHours = 24): bool
    {
        return self::query()
            ->where('integration_id', $integrationId)
            ->where('contact_wa_id', $contactWaId)
            ->where('direction', 'inbound')
            ->where('occurred_at', '>=', now()->subHours($withinHours ?? 24))
            ->exists();
    }
}
