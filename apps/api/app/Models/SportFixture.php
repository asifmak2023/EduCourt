<?php

namespace App\Models;

use App\Enums\FixtureOutcome;
use App\Enums\FixtureStatus;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class SportFixture extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'sport_id', 'sport_team_id', 'opponent',
        'home_away', 'venue', 'fixture_date', 'start_time', 'status',
        'our_score', 'opponent_score', 'outcome', 'remarks', 'created_by',
    ];

    protected $attributes = [
        'home_away' => 'home',
        'status' => 'scheduled',
    ];

    protected function casts(): array
    {
        return [
            'status' => FixtureStatus::class,
            'outcome' => FixtureOutcome::class,
            'fixture_date' => 'date',
        ];
    }

    public function sport(): BelongsTo
    {
        return $this->belongsTo(Sport::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(SportTeam::class, 'sport_team_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
