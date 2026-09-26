<?php

namespace App\Services\Exams;

use App\Models\Exam;
use App\Models\ExamMark;
use App\Models\ExamPaper;
use App\Models\GradeScale;
use App\Models\Student;
use App\Models\StudentEnrollment;
use Illuminate\Support\Collection;

/**
 * Derives result cards and merit lists from the marks captured against the
 * papers on an exam.
 */
class ResultService
{
    public function defaultScale(int $campusId): ?GradeScale
    {
        return GradeScale::query()
            ->with('items')
            ->where('campus_id', $campusId)
            ->where('is_active', true)
            ->orderByDesc('is_default')
            ->orderBy('id')
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    public function resultCard(Student $student, Exam $exam, ?GradeScale $scale = null): array
    {
        $scale ??= $this->defaultScale((int) $exam->campus_id);
        $scale?->loadMissing('items');

        $enrollment = StudentEnrollment::query()
            ->where('student_id', $student->id)
            ->where('academic_year_id', $exam->academic_year_id)
            ->first();

        $papers = ExamPaper::query()
            ->with(['subject', 'duties'])
            ->where('exam_id', $exam->id)
            ->when($enrollment !== null, fn ($q) => $q->where('class_room_id', $enrollment->class_room_id))
            ->orderBy('exam_date')
            ->get();

        $marks = ExamMark::query()
            ->where('exam_id', $exam->id)
            ->where('student_id', $student->id)
            ->get()
            ->keyBy('exam_paper_id');

        $subjects = [];
        $totalObtained = 0.0;
        $totalMax = 0.0;
        $failed = 0;

        foreach ($papers as $paper) {
            $mark = $marks->get($paper->id);
            $obtained = $mark?->is_absent ? null : ($mark?->marks_obtained !== null ? (float) $mark->marks_obtained : null);

            $subjects[] = [
                'exam_paper_id' => $paper->id,
                'subject_id' => $paper->subject_id,
                'subject' => $paper->subject?->name,
                'max_marks' => (float) $paper->max_marks,
                'pass_marks' => (float) $paper->pass_marks,
                'marks_obtained' => $obtained,
                'is_absent' => (bool) $mark?->is_absent,
                'remarks' => $mark?->remarks,
                'passed' => $obtained !== null && $obtained >= (float) $paper->pass_marks,
            ];

            if ($obtained !== null) {
                $totalObtained += $obtained;
                $totalMax += (float) $paper->max_marks;

                if ($obtained < (float) $paper->pass_marks) {
                    $failed++;
                }
            } else {
                $totalMax += (float) $paper->max_marks;
            }
        }

        $percentage = $totalMax > 0 ? round(($totalObtained / $totalMax) * 100, 2) : 0.0;
        $grade = $scale?->gradeFor($percentage);

        return [
            'student_id' => $student->id,
            'exam_id' => $exam->id,
            'class_room_id' => $enrollment?->class_room_id,
            'subjects' => $subjects,
            'total_obtained' => round($totalObtained, 2),
            'total_max' => round($totalMax, 2),
            'percentage' => $percentage,
            'grade' => $grade?->grade,
            'grade_points' => $grade?->points,
            'failed_subjects' => $failed,
            'result' => $failed === 0 && count($subjects) > 0 ? 'pass' : 'fail',
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function meritList(Exam $exam, int $classRoomId, ?GradeScale $scale = null): array
    {
        $scale ??= $this->defaultScale((int) $exam->campus_id);
        $scale?->loadMissing('items');

        $studentIds = StudentEnrollment::query()
            ->where('academic_year_id', $exam->academic_year_id)
            ->where('class_room_id', $classRoomId)
            ->where('status', 'active')
            ->pluck('student_id');

        /** @var Collection<int, Student> $students */
        $students = Student::query()->whereIn('id', $studentIds)->get();

        $totalMarksByStudent = ExamMark::query()
            ->where('exam_id', $exam->id)
            ->whereIn('student_id', $studentIds)
            ->where('is_absent', false)
            ->selectRaw('student_id, SUM(marks_obtained) as total')
            ->groupBy('student_id')
            ->pluck('total', 'student_id');

        $maxTotal = (float) ExamPaper::query()
            ->where('exam_id', $exam->id)
            ->where('class_room_id', $classRoomId)
            ->sum('max_marks');

        $rows = $students->map(function (Student $student) use ($totalMarksByStudent, $maxTotal) {
            $total = (float) ($totalMarksByStudent[$student->id] ?? 0);
            $percentage = $maxTotal > 0 ? round(($total / $maxTotal) * 100, 2) : 0.0;

            return [
                'student_id' => $student->id,
                'student' => trim($student->first_name.' '.$student->last_name),
                'total_obtained' => round($total, 2),
                'percentage' => $percentage,
            ];
        });

        $ranked = $rows->sortByDesc('percentage')->values();

        return $ranked->map(function (array $row, int $index) use ($scale) {
            $row['rank'] = $index + 1;
            $row['grade'] = $scale?->gradeFor($row['percentage'])?->grade;

            return $row;
        })->all();
    }
}
