<?php

namespace App\Models;

use App\Enums\HostelType;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Hostel extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'name', 'code', 'type', 'warden_user_id',
        'warden_name', 'warden_phone', 'address', 'capacity', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'type' => HostelType::class,
            'capacity' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function warden(): BelongsTo
    {
        return $this->belongsTo(User::class, 'warden_user_id');
    }

    public function rooms(): HasMany
    {
        return $this->hasMany(HostelRoom::class);
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(HostelAllocation::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
