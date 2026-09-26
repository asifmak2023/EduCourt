<?php

namespace App\Models;

use App\Enums\CounsellingStatus;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class CounsellingSession extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'student_id', 'counsellor_user_id',
        'session_date', 'type', 'status', 'summary', 'confidential_notes',
        'follow_up_on',
    ];

    protected function casts(): array
    {
        return [
            'status' => CounsellingStatus::class,
            'session_date' => 'date',
            'follow_up_on' => 'date',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function counsellor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'counsellor_user_id');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
