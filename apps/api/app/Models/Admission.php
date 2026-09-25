<?php

namespace App\Models;

use App\Enums\AdmissionStatus;
use App\Enums\Gender;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Admission extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'application_no', 'first_name', 'last_name',
        'gender', 'date_of_birth', 'class_room_id', 'academic_year_id',
        'guardian_name', 'guardian_phone', 'guardian_email', 'guardian_relation',
        'previous_school', 'address', 'city', 'status', 'applied_on',
        'decided_on', 'decided_by', 'rejection_reason', 'student_id', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'gender' => Gender::class,
            'status' => AdmissionStatus::class,
            'date_of_birth' => 'date',
            'applied_on' => 'date',
            'decided_on' => 'date',
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

    public function classRoom(): BelongsTo
    {
        return $this->belongsTo(ClassRoom::class);
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function decidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(AdmissionDocument::class);
    }

    public function isEnrolled(): bool
    {
        return $this->status->isEnrolled();
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
