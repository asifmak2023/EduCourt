<?php

namespace App\Models;

use App\Enums\CampusType;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Campus extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'name', 'code', 'type', 'email', 'phone', 'whatsapp',
        'website', 'address', 'is_active', 'settings',
        'academic_model', 'term_system', 'grading_system', 'credit_hours_enabled',
    ];

    protected function casts(): array
    {
        return [
            'type' => CampusType::class,
            'is_active' => 'boolean',
            'settings' => 'array',
            'credit_hours_enabled' => 'boolean',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function scopeAssignments(): HasMany
    {
        return $this->hasMany(ScopeAssignment::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
