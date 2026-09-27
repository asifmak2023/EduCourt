<?php

namespace App\Models;

use App\Enums\OutpassStatus;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class HostelOutpass extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'hostel_allocation_id', 'student_id',
        'from_datetime', 'to_datetime', 'reason', 'status', 'approved_by', 'approved_at',
    ];

    protected function casts(): array
    {
        return [
            'from_datetime' => 'datetime',
            'to_datetime' => 'datetime',
            'approved_at' => 'datetime',
            'status' => OutpassStatus::class,
        ];
    }

    public function allocation(): BelongsTo
    {
        return $this->belongsTo(HostelAllocation::class, 'hostel_allocation_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
