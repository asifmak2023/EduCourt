<?php

namespace App\Models;

use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class SportTeam extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'sport_id', 'name', 'age_group',
        'gender', 'coach_user_id', 'is_active', 'notes',
    ];

    protected $attributes = [
        'is_active' => true,
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function sport(): BelongsTo
    {
        return $this->belongsTo(Sport::class);
    }

    public function coach(): BelongsTo
    {
        return $this->belongsTo(User::class, 'coach_user_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(SportTeamMember::class);
    }

    public function trainingSessions(): HasMany
    {
        return $this->hasMany(SportTrainingSession::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
