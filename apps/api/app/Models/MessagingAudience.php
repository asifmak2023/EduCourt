<?php

namespace App\Models;

use App\Enums\MessagingAudienceKind;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * A campus group or broadcast list.
 *
 * Meta has no native groups/broadcast lists, so an audience is a named set of
 * recipients (explicit members plus dynamic segments) that fans out as
 * individual WhatsApp messages through the delivery engine.
 */
class MessagingAudience extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'messaging_audiences';

    protected $fillable = [
        'institution_id', 'campus_id', 'kind', 'name', 'description',
        'is_active', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'kind' => MessagingAudienceKind::class,
            'is_active' => 'boolean',
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

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function members(): HasMany
    {
        return $this->hasMany(MessagingAudienceMember::class, 'audience_id');
    }

    public function segments(): HasMany
    {
        return $this->hasMany(MessagingAudienceSegment::class, 'audience_id');
    }

    public function broadcasts(): HasMany
    {
        return $this->hasMany(MessagingBroadcast::class, 'audience_id');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['campus_id', 'kind', 'name', 'description', 'is_active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }
}
