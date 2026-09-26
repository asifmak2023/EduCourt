<?php

namespace App\Models;

use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class FeeReminder extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'student_id', 'academic_year_id',
        'guardian_id', 'channel', 'recipient_name', 'recipient_email',
        'recipient_phone', 'outstanding', 'bucket', 'oldest_due_date',
        'days_overdue', 'message', 'status', 'sent_at', 'failure_reason',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'channel' => ReminderChannel::class,
            'status' => ReminderStatus::class,
            'outstanding' => 'decimal:2',
            'oldest_due_date' => 'date',
            'sent_at' => 'datetime',
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

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function guardian(): BelongsTo
    {
        return $this->belongsTo(Guardian::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
