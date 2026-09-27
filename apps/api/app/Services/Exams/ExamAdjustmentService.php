<?php

namespace App\Services\Exams;

use App\Enums\ModerationStatus;
use App\Enums\ModerationType;
use App\Enums\ReevaluationStatus;
use App\Models\Exam;
use App\Models\ExamMark;
use App\Models\ExamModeration;
use App\Models\ExamReevaluation;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Applies exam moderation (grace marks / scaling) and re-evaluation adjustments
 * to captured marks while preserving the original score.
 */
class ExamAdjustmentService
{
    public function approveModeration(ExamModeration $moderation, int $userId): ExamModeration
    {
        if ($moderation->status !== ModerationStatus::Pending) {
            throw ValidationException::withMessages([
                'status' => 'Only pending moderations can be approved.',
            ]);
        }

        $moderation->forceFill([
            'status' => ModerationStatus::Approved,
            'approved_by' => $userId,
        ])->save();

        return $moderation->refresh();
    }

    public function applyModeration(ExamModeration $moderation): ExamModeration
    {
        if ($moderation->status !== ModerationStatus::Approved) {
            throw ValidationException::withMessages([
                'status' => 'The moderation must be approved before it can be applied.',
            ]);
        }

        return DB::transaction(function () use ($moderation) {
            $paper = $moderation->paper()->firstOrFail();
            $maxMarks = (float) $paper->max_marks;

            $marks = ExamMark::query()
                ->where('exam_paper_id', $moderation->exam_paper_id)
                ->where('is_absent', false)
                ->whereNotNull('marks_obtained')
                ->get();

            foreach ($marks as $mark) {
                $original = (float) ($mark->original_marks_obtained ?? $mark->marks_obtained);

                $adjusted = match ($moderation->type) {
                    ModerationType::GraceMarks => $original + (float) $moderation->value,
                    ModerationType::Scaling => $original * (1 + ((float) $moderation->value / 100)),
                };

                $adjusted = max(0.0, min($maxMarks, round($adjusted, 2)));

                $mark->forceFill([
                    'original_marks_obtained' => $original,
                    'moderated_marks_obtained' => $adjusted,
                    'moderation_source' => 'moderation',
                ])->save();
            }

            $moderation->forceFill([
                'status' => ModerationStatus::Applied,
                'applied_at' => now(),
            ])->save();

            return $moderation->refresh();
        });
    }

    public function rejectModeration(ExamModeration $moderation): ExamModeration
    {
        if ($moderation->status === ModerationStatus::Applied) {
            throw ValidationException::withMessages([
                'status' => 'An applied moderation cannot be rejected.',
            ]);
        }

        $moderation->forceFill(['status' => ModerationStatus::Rejected])->save();

        return $moderation->refresh();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function applyReevaluation(ExamReevaluation $reevaluation, array $data, int $userId): ExamReevaluation
    {
        if ($reevaluation->status === ReevaluationStatus::Completed) {
            throw ValidationException::withMessages([
                'status' => 'This re-evaluation has already been completed.',
            ]);
        }

        return DB::transaction(function () use ($reevaluation, $data, $userId) {
            $status = $data['status'];
            $revised = $data['revised_marks'] ?? null;

            if ($status === ReevaluationStatus::Approved->value && $revised === null) {
                throw ValidationException::withMessages([
                    'revised_marks' => 'Revised marks are required when approving a re-evaluation.',
                ]);
            }

            $reevaluation->forceFill([
                'status' => $status,
                'revised_marks' => $revised,
                'remarks' => $data['remarks'] ?? $reevaluation->remarks,
                'reviewed_by' => $userId,
                'reviewed_at' => now(),
            ])->save();

            if ($revised !== null) {
                $mark = ExamMark::query()
                    ->where('exam_paper_id', $reevaluation->exam_paper_id)
                    ->where('student_id', $reevaluation->student_id)
                    ->first();

                if ($mark !== null) {
                    $mark->forceFill([
                        'original_marks_obtained' => $mark->original_marks_obtained ?? $mark->marks_obtained,
                        'moderated_marks_obtained' => $revised,
                        'moderation_source' => 'reevaluation',
                    ])->save();
                }
            }

            return $reevaluation->refresh();
        });
    }

    /**
     * Students who failed a paper and may be eligible for a supplementary exam.
     *
     * @return array<int, array<string, mixed>>
     */
    public function failedStudents(Exam $exam, int $classRoomId): array
    {
        $papers = $exam->papers()->where('class_room_id', $classRoomId)->get();

        $rows = [];

        foreach ($papers as $paper) {
            $marks = ExamMark::query()
                ->with('student')
                ->where('exam_paper_id', $paper->id)
                ->get();

            foreach ($marks as $mark) {
                $effective = $mark->effective_marks;

                if ($effective === null || $effective >= (float) $paper->pass_marks) {
                    continue;
                }

                $rows[] = [
                    'student_id' => $mark->student_id,
                    'student' => $mark->student?->full_name,
                    'exam_paper_id' => $paper->id,
                    'class_room_id' => $classRoomId,
                    'subject_id' => $paper->subject_id,
                    'marks_obtained' => $effective,
                    'pass_marks' => (float) $paper->pass_marks,
                ];
            }
        }

        return $rows;
    }
}
