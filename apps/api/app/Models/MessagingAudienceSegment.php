<?php

namespace App\Models;

use App\Enums\MessagingSegmentType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A dynamic rule that expands an audience to recipients at send time, e.g. all
 * parents in a section, or all staff with a given role.
 */
class MessagingAudienceSegment extends Model
{
    use HasFactory;

    protected $table = 'messaging_audience_segments';

    protected $fillable = [
        'audience_id', 'segment_type', 'segment_ref', 'segment_value',
    ];

    protected function casts(): array
    {
        return [
            'segment_type' => MessagingSegmentType::class,
        ];
    }

    public function audience(): BelongsTo
    {
        return $this->belongsTo(MessagingAudience::class, 'audience_id');
    }
}
