<?php

namespace App\Models;

use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A record of a broadcast sent to an audience, with per-recipient tallies.
 */
class MessagingBroadcast extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, SoftDeletes;

    protected $table = 'messaging_broadcasts';

    protected $fillable = [
        'institution_id', 'campus_id', 'audience_id', 'title', 'body',
        'created_by', 'recipients_total', 'recipients_sent',
        'recipients_failed', 'status',
    ];

    protected function casts(): array
    {
        return [
            'recipients_total' => 'integer',
            'recipients_sent' => 'integer',
            'recipients_failed' => 'integer',
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

    public function audience(): BelongsTo
    {
        return $this->belongsTo(MessagingAudience::class, 'audience_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
