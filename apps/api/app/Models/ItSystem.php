<?php

namespace App\Models;

use App\Enums\SystemStatus;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class ItSystem extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'name', 'type', 'url', 'owner',
        'status', 'uptime_percent', 'last_checked_at', 'notes',
    ];

    protected $attributes = [
        'type' => 'portal',
        'status' => 'up',
    ];

    protected function casts(): array
    {
        return [
            'status' => SystemStatus::class,
            'uptime_percent' => 'decimal:2',
            'last_checked_at' => 'datetime',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
