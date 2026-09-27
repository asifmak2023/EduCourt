<?php

namespace App\Models;

use App\Enums\TeamMemberStatus;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class SportTeamMember extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'sport_team_id', 'student_id',
        'position', 'jersey_no', 'joined_on', 'status', 'notes',
    ];

    protected $attributes = [
        'status' => 'active',
    ];

    protected function casts(): array
    {
        return [
            'status' => TeamMemberStatus::class,
            'joined_on' => 'date',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(SportTeam::class, 'sport_team_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
