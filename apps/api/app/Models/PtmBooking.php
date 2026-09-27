<?php

namespace App\Models;

use App\Enums\PtmBookingStatus;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class PtmBooking extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'ptm_slot_id', 'student_id',
        'guardian_name', 'guardian_phone', 'notes', 'status',
    ];

    protected function casts(): array
    {
        return [
            'status' => PtmBookingStatus::class,
        ];
    }

    public function slot(): BelongsTo
    {
        return $this->belongsTo(PtmSlot::class, 'ptm_slot_id');
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
