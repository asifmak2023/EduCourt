<?php

namespace App\Models;

use App\Enums\SupplementaryStatus;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class ExamSupplementary extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'original_exam_id', 'exam_id', 'exam_paper_id',
        'student_id', 'subject_id', 'fee_amount', 'is_paid', 'status', 'approved_by',
        'approved_at', 'remarks',
    ];

    protected function casts(): array
    {
        return [
            'status' => SupplementaryStatus::class,
            'fee_amount' => 'decimal:2',
            'is_paid' => 'boolean',
            'approved_at' => 'datetime',
        ];
    }

    public function originalExam(): BelongsTo
    {
        return $this->belongsTo(Exam::class, 'original_exam_id');
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

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
