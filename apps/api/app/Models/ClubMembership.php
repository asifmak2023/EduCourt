<?php

namespace App\Models;

use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ClubMembership extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'student_club_id', 'student_id', 'role',
        'status', 'joined_on', 'notes',
    ];

    protected function casts(): array
    {
        return ['joined_on' => 'date'];
    }

    public function club(): BelongsTo
    {
        return $this->belongsTo(StudentClub::class, 'student_club_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
