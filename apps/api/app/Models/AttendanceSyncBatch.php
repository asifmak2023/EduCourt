<?php

namespace App\Models;

use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class AttendanceSyncBatch extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity;

    protected $fillable = [
        'institution_id', 'campus_id', 'user_id', 'client_batch_uuid', 'device_id',
        'total_records', 'applied_count', 'duplicate_count', 'conflict_count', 'synced_at',
    ];

    protected function casts(): array
    {
        return [
            'total_records' => 'integer',
            'applied_count' => 'integer',
            'duplicate_count' => 'integer',
            'conflict_count' => 'integer',
            'synced_at' => 'datetime',
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
