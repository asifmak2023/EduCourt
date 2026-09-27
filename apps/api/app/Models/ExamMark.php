<?php

namespace App\Models;

use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExamMark extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'exam_id', 'exam_paper_id', 'student_id',
        'class_room_id', 'subject_id', 'entered_by', 'marks_obtained', 'is_absent', 'remarks',
        'original_marks_obtained', 'moderated_marks_obtained', 'moderation_source',
    ];

    protected function casts(): array
    {
        return [
            'marks_obtained' => 'decimal:2',
            'original_marks_obtained' => 'decimal:2',
            'moderated_marks_obtained' => 'decimal:2',
            'is_absent' => 'boolean',
        ];
    }

    /**
     * Marks after any moderation or re-evaluation has been applied.
     */
    public function getEffectiveMarksAttribute(): ?float
    {
        if ($this->is_absent) {
            return null;
        }

        $value = $this->moderated_marks_obtained ?? $this->marks_obtained;

        return $value === null ? null : (float) $value;
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function campus(): BelongsTo
    {
        return $this->belongsTo(Campus::class);
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function paper(): BelongsTo
    {
        return $this->belongsTo(ExamPaper::class, 'exam_paper_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function classRoom(): BelongsTo
    {
        return $this->belongsTo(ClassRoom::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }
}
