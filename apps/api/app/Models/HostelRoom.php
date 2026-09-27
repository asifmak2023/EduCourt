<?php

namespace App\Models;

use App\Enums\HostelRoomType;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class HostelRoom extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'hostel_id', 'room_no', 'floor', 'type',
        'capacity', 'occupied', 'monthly_fee', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'type' => HostelRoomType::class,
            'capacity' => 'integer',
            'occupied' => 'integer',
            'monthly_fee' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function hostel(): BelongsTo
    {
        return $this->belongsTo(Hostel::class);
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(HostelAllocation::class);
    }

    public function availableBeds(): int
    {
        return max(0, (int) $this->capacity - (int) $this->occupied);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
