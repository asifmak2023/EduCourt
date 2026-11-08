<?php

namespace App\Models;

use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Institution-owned approved WhatsApp template mapping.
 *
 * Templates are authored and approved in the institution's own WABA; EduCourt
 * stores only the mapping and ordered parameter configuration.
 */
class IntegrationTemplate extends Model
{
    use BelongsToInstitution, HasFactory, LogsActivity;

    protected $fillable = [
        'institution_id', 'sender_id', 'purpose', 'name', 'language',
        'approval_status', 'parameters',
    ];

    protected function casts(): array
    {
        return [
            'parameters' => 'array',
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

    public function isApproved(): bool
    {
        return $this->approval_status === 'approved';
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
