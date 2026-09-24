<?php

namespace App\Models;

use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Institution extends Model
{
    use BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'name', 'code', 'legal_name', 'email', 'phone', 'website', 'address',
        'is_active', 'settings',
        'plan', 'status', 'trial_ends_at', 'max_campuses',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'settings' => 'array',
            'trial_ends_at' => 'datetime',
            'max_campuses' => 'integer',
        ];
    }

    public function campuses(): HasMany
    {
        return $this->hasMany(Campus::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
