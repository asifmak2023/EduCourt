<?php

namespace App\Models;

use App\Enums\MessagingMemberType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An explicit member of an audience: a guardian, student, staff member or a
 * raw phone number.
 */
class MessagingAudienceMember extends Model
{
    use HasFactory;

    protected $table = 'messaging_audience_members';

    protected $fillable = [
        'audience_id', 'member_type', 'member_id', 'display_name', 'phone',
    ];

    protected function casts(): array
    {
        return [
            'member_type' => MessagingMemberType::class,
        ];
    }

    public function audience(): BelongsTo
    {
        return $this->belongsTo(MessagingAudience::class, 'audience_id');
    }
}
