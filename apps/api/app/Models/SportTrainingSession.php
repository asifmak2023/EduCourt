<?php

namespace App\Models;

use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class SportTrainingSession extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'sport_team_id', 'title', 'session_date',
        'start_time', 'end_time', 'venue', 'focus', 'notes', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'session_date' => 'date',
        ];
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
