<?php

namespace Database\Seeders\Uat;

use App\Enums\ExamStatus;
use App\Enums\InvigilationRole;
use App\Enums\ModerationStatus;
use App\Enums\ModerationType;
use App\Enums\ReevaluationStatus;
use App\Enums\SupplementaryStatus;
use App\Models\Exam;
use App\Models\ExamMark;
use App\Models\ExamModeration;
use App\Models\ExamPaper;
use App\Models\ExamReevaluation;
use App\Models\ExamSupplementary;
use App\Models\ExamType;
use App\Models\GradeScale;
use App\Models\GradeScaleItem;
use App\Models\InvigilationDuty;

/**
 * Seeds exam types, grading scales, exams, papers, marks, moderation,
 * reevaluation, supplementary exams and invigilation duties.
 */
class UatExamsSeeder extends UatSeederBase
{
    public function seed(UatCampusContext $ctx): void
    {
        mt_srand((int) $ctx->campus->id + 4000);

        $types = $this->examTypes($ctx);
        $this->gradeScale($ctx);

        $exam = $this->exam($ctx, $types, 'First Term Examination', $ctx->terms[0], 'completed', '2026-12-10', '2026-12-20');
        $papers = $this->papers($ctx, $exam, $ctx->terms[0]);

        $this->marks($ctx, $exam, $papers);
        $this->moderationAndReevaluation($ctx, $exam);
        $this->supplementaries($ctx, $exam);

        $this->command?->info(sprintf(
            'UAT:   %s - %d exam papers, %d marks',
            $ctx->campusCode(),
            count($papers),
            ExamMark::query()->where('campus_id', $ctx->campus->id)->count()
        ));
    }

    /**
     * @return array<string, ExamType>
     */
    protected function examTypes(UatCampusContext $ctx): array
    {
        $tenant = $this->tenant($ctx->campus);
        $definitions = [
            ['Terminal Examination', 'TERM', 100],
            ['Mid-Term Examination', 'MID', 50],
            ['Monthly Test', 'MONTH', 20],
            ['Annual Examination', 'ANNUAL', 100],
        ];

        $models = [];
        foreach ($definitions as [$name, $code, $weightage]) {
            $models[$code] = $this->first(ExamType::class, [
                'campus_id' => $ctx->campus->id,
                'code' => $code,
            ], $tenant + [
                'name' => $name,
                'weightage' => $weightage,
                'is_active' => true,
            ]);
        }

        return $models;
    }

    protected function gradeScale(UatCampusContext $ctx): GradeScale
    {
        $tenant = $this->tenant($ctx->campus);

        $scale = $this->first(GradeScale::class, [
            'campus_id' => $ctx->campus->id,
            'code' => 'PCT',
        ], $tenant + [
            'name' => 'Percentage Grading',
            'is_default' => true,
            'is_active' => true,
        ]);

        $items = [
            ['A+', 90, 100, 4.0],
            ['A', 80, 89.99, 3.7],
            ['B', 70, 79.99, 3.3],
            ['C', 60, 69.99, 3.0],
            ['D', 50, 59.99, 2.0],
            ['E', 40, 49.99, 1.0],
            ['F', 0, 39.99, 0.0],
        ];

        foreach ($items as $i => [$grade, $min, $max, $points]) {
            GradeScaleItem::firstOrCreate(
                ['grade_scale_id' => $scale->id, 'grade' => $grade],
                [
                    'sequence' => $i + 1,
                    'min_percentage' => $min,
                    'max_percentage' => $max,
                    'points' => $points,
                    'remark' => $grade === 'F' ? 'Fail' : 'Pass',
                ]
            );
        }

        return $scale;
    }

    /**
     * @param  array<string, ExamType>  $types
     */
    protected function exam(
        UatCampusContext $ctx,
        array $types,
        string $name,
        \App\Models\Term $term,
        string $status,
        string $start,
        string $end
    ): Exam {
        return $this->first(Exam::class, [
            'campus_id' => $ctx->campus->id,
            'name' => $name.' 2026',
        ], $this->tenant($ctx->campus) + [
            'academic_year_id' => $ctx->year->id,
            'term_id' => $term->id,
            'exam_type_id' => $types['TERM']->id,
            'starts_on' => $start,
            'ends_on' => $end,
            'status' => $status,
            'description' => $name.' for academic year '.$ctx->year->name,
        ]);
    }

    /**
     * @return array<int, ExamPaper>
     */
    protected function papers(UatCampusContext $ctx, Exam $exam, \App\Models\Term $term): array
    {
        $tenant = $this->tenant($ctx->campus);
        $papers = [];

        foreach ($ctx->classes as $class) {
            foreach ($ctx->subjects as $subject) {
                $paper = $this->first(ExamPaper::class, [
                    'exam_id' => $exam->id,
                    'class_room_id' => $class->id,
                    'subject_id' => $subject->id,
                ], $tenant + [
                    'exam_date' => $this->day('2026-12-10', $class->sequence),
                    'starts_at' => '09:00:00',
                    'ends_at' => '11:00:00',
                    'max_marks' => 100,
                    'pass_marks' => 40,
                ]);

                $papers[$class->id.'-'.$subject->id] = $paper;

                InvigilationDuty::firstOrCreate(
                    ['exam_paper_id' => $paper->id, 'user_id' => $ctx->teacher(($class->sequence + $subject->id) % max(1, count($ctx->teachers)))?->id, 'role' => InvigilationRole::Chief->value],
                    $tenant + ['notes' => 'Chief invigilator duty.']
                );
            }
        }

        return $papers;
    }

    /**
     * @param  array<int, ExamPaper>  $papers
     */
    protected function marks(UatCampusContext $ctx, Exam $exam, array $papers): void
    {
        $tenant = $this->tenant($ctx->campus);

        foreach ($ctx->students as $index => $student) {
            $enrollment = $ctx->enrollments[$student->id] ?? null;
            if ($enrollment === null) {
                continue;
            }

            foreach ($ctx->subjects as $subject) {
                $paper = $papers[$enrollment->class_room_id.'-'.$subject->id] ?? null;
                if ($paper === null) {
                    continue;
                }

                $isAbsent = ($index + $subject->id) % 37 === 0;
                $marks = $isAbsent ? null : $this->randInt(35, 98);

                ExamMark::firstOrCreate(
                    ['exam_paper_id' => $paper->id, 'student_id' => $student->id],
                    $tenant + [
                        'exam_id' => $exam->id,
                        'class_room_id' => $enrollment->class_room_id,
                        'subject_id' => $subject->id,
                        'entered_by' => $ctx->teacher(0)?->id,
                        'marks_obtained' => $marks,
                        'original_marks_obtained' => $marks,
                        'is_absent' => $isAbsent,
                    ]
                );
            }
        }
    }

    protected function moderationAndReevaluation(UatCampusContext $ctx, Exam $exam): void
    {
        $tenant = $this->tenant($ctx->campus);

        $paper = ExamPaper::query()
            ->where('exam_id', $exam->id)
            ->orderBy('id')
            ->first();

        if ($paper === null) {
            return;
        }

        ExamModeration::firstOrCreate(
            ['exam_id' => $exam->id, 'exam_paper_id' => $paper->id, 'type' => ModerationType::GraceMarks->value],
            $tenant + [
                'value' => 5,
                'reason' => 'Paper was slightly tougher than expected.',
                'status' => ModerationStatus::Approved,
                'created_by' => $ctx->role('exam_controller')?->id,
                'approved_by' => $ctx->role('principal')?->id,
                'applied_at' => now(),
            ]
        );

        $mark = ExamMark::query()
            ->where('exam_id', $exam->id)
            ->where('is_absent', false)
            ->orderBy('id')
            ->first();

        if ($mark === null) {
            return;
        }

        ExamReevaluation::firstOrCreate(
            ['exam_id' => $exam->id, 'exam_paper_id' => $mark->exam_paper_id, 'student_id' => $mark->student_id],
            $tenant + [
                'reason' => 'Student requested re-check of answer sheet.',
                'status' => ReevaluationStatus::Requested,
                'original_marks' => $mark->marks_obtained,
                'requested_by' => $ctx->role('exam_controller')?->id,
            ]
        );
    }

    protected function supplementaries(UatCampusContext $ctx, Exam $exam): void
    {
        $tenant = $this->tenant($ctx->campus);

        $failing = ExamMark::query()
            ->where('exam_id', $exam->id)
            ->whereNotNull('marks_obtained')
            ->where('marks_obtained', '<', 40)
            ->orderBy('id')
            ->limit(5)
            ->get();

        foreach ($failing as $mark) {
            ExamSupplementary::firstOrCreate(
                ['original_exam_id' => $exam->id, 'student_id' => $mark->student_id, 'subject_id' => $mark->subject_id],
                $tenant + [
                    'exam_id' => $exam->id,
                    'exam_paper_id' => $mark->exam_paper_id,
                    'fee_amount' => 1500,
                    'is_paid' => true,
                    'status' => SupplementaryStatus::Registered,
                    'remarks' => 'Registered for supplementary paper.',
                ]
            );
        }
    }
}
