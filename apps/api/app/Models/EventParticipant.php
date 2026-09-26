<?php

namespace App\Models;

use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventParticipant extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory;

    protected $fillable = [
        'institution_id', 'campus_id', 'student_event_id', 'student_id', 'role',
        'status', 'position', 'remarks',
    ];

    public function event(): BelongsTo
    {
        return $this->belongsTo(StudentEvent::class, 'student_event_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
