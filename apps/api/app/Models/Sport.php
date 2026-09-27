<?php

namespace App\Models;

use App\Enums\SportCategory;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Sport extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'name', 'code', 'category', 'season',
        'coach_user_id', 'min_age_years', 'max_age_years', 'min_attendance_percent',
        'budget', 'is_active', 'rules', 'description',
    ];

    protected $attributes = [
        'category' => 'outdoor',
        'budget' => 0,
        'is_active' => true,
    ];

    protected function casts(): array
    {
        return [
            'category' => SportCategory::class,
            'min_age_years' => 'integer',
            'max_age_years' => 'integer',
            'min_attendance_percent' => 'decimal:2',
            'budget' => 'decimal:2',
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

    public function coach(): BelongsTo
    {
        return $this->belongsTo(User::class, 'coach_user_id');
    }

    public function teams(): HasMany
    {
        return $this->hasMany(SportTeam::class);
    }

    public function fixtures(): HasMany
    {
        return $this->hasMany(SportFixture::class);
    }

    public function achievements(): HasMany
    {
        return $this->hasMany(SportAchievement::class);
    }

    public function equipment(): HasMany
    {
        return $this->hasMany(SportEquipment::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
