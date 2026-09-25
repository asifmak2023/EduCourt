<?php

namespace App\Models;

use App\Enums\AttendanceStatus;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class StaffAttendance extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity;

    protected $fillable = [
        'institution_id', 'campus_id', 'user_id', 'attendance_date', 'status',
        'check_in', 'check_out', 'remarks', 'marked_by',
    ];

    protected function casts(): array
    {
        return [
            'status' => AttendanceStatus::class,
            'attendance_date' => 'date',
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function markedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'marked_by');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
