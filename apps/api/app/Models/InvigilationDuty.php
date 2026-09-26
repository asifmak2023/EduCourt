<?php

namespace App\Models;

use App\Enums\InvigilationRole;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvigilationDuty extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory;

    protected $fillable = [
        'institution_id', 'campus_id', 'exam_paper_id', 'user_id', 'role', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'role' => InvigilationRole::class,
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

    public function examPaper(): BelongsTo
    {
        return $this->belongsTo(ExamPaper::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
