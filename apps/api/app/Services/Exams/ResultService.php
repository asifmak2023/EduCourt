<?php

namespace App\Services\Exams;

use App\Models\Exam;
use App\Models\ExamMark;
use App\Models\ExamPaper;
use App\Models\GradeScale;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\TeachingAssignment;
use App\Models\User;
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
            $obtained = $mark?->effective_marks;

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
            ->selectRaw('student_id, SUM(COALESCE(moderated_marks_obtained, marks_obtained)) as total')
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

    /**
     * Per-subject and overall achievement for one class sitting an exam.
     *
     * @return array<string, mixed>
     */
    public function classAnalysis(Exam $exam, int $classRoomId, ?GradeScale $scale = null): array
    {
        $scale ??= $this->defaultScale((int) $exam->campus_id);
        $scale?->loadMissing('items');

        $papers = ExamPaper::query()
            ->with('subject')
            ->where('exam_id', $exam->id)
            ->where('class_room_id', $classRoomId)
            ->get();

        $paperIds = $papers->pluck('id');

        $marksByPaper = ExamMark::query()
            ->whereIn('exam_paper_id', $paperIds)
            ->get()
            ->groupBy('exam_paper_id');

        $subjects = [];

        foreach ($papers->groupBy('subject_id') as $subjectId => $subjectPapers) {
            $appeared = 0;
            $absent = 0;
            $passed = 0;
            $obtainedSum = 0.0;
            $maxSum = 0.0;
            $highest = null;
            $lowest = null;

            foreach ($subjectPapers as $paper) {
                $maxSum += (float) $paper->max_marks;

                foreach ($marksByPaper->get($paper->id, collect()) as $mark) {
                    if ($mark->is_absent) {
                        $absent++;

                        continue;
                    }

                    $value = $mark->effective_marks;

                    if ($value === null) {
                        continue;
                    }

                    $appeared++;
                    $obtainedSum += $value;
                    $highest = $highest === null ? $value : max($highest, $value);
                    $lowest = $lowest === null ? $value : min($lowest, $value);

                    if ($value >= (float) $paper->pass_marks) {
                        $passed++;
                    }
                }
            }

            $subjects[] = [
                'subject_id' => (int) $subjectId,
                'subject' => $subjectPapers->first()?->subject?->name,
                'papers' => $subjectPapers->count(),
                'appeared' => $appeared,
                'absent' => $absent,
                'passed' => $passed,
                'pass_rate' => $appeared > 0 ? round(($passed / $appeared) * 100, 2) : 0.0,
                'average_percentage' => $maxSum > 0 ? round(($obtainedSum / $maxSum) * 100, 2) : 0.0,
                'highest' => $highest,
                'lowest' => $lowest,
            ];
        }

        $totals = $this->studentTotals($exam, $classRoomId);
        $percentages = $totals->pluck('percentage');
        $distribution = [];

        if ($scale !== null) {
            foreach ($scale->items as $item) {
                $distribution[$item->grade] = 0;
            }

            foreach ($percentages as $percentage) {
                $grade = $scale->gradeFor((float) $percentage)?->grade;

                if ($grade !== null) {
                    $distribution[$grade] = ($distribution[$grade] ?? 0) + 1;
                }
            }
        }

        return [
            'class_room_id' => $classRoomId,
            'exam_id' => $exam->id,
            'subjects' => $subjects,
            'students' => $totals->count(),
            'average_percentage' => $percentages->isNotEmpty() ? round($percentages->avg(), 2) : 0.0,
            'grade_distribution' => $distribution,
        ];
    }

    /**
     * One subject across the classes of an exam.
     *
     * @return array<string, mixed>
     */
    public function subjectAnalysis(Exam $exam, int $subjectId): array
    {
        $rows = [];

        $papers = ExamPaper::query()
            ->where('exam_id', $exam->id)
            ->where('subject_id', $subjectId)
            ->get();

        foreach ($papers as $paper) {
            $marks = ExamMark::query()->where('exam_paper_id', $paper->id)->get();
            $appeared = $marks->filter(fn (ExamMark $m) => $m->effective_marks !== null)->count();
            $passed = $marks->filter(fn (ExamMark $m) => $m->effective_marks !== null
                && $m->effective_marks >= (float) $paper->pass_marks)->count();
            $obtained = (float) $marks->sum(fn (ExamMark $m) => $m->effective_marks ?? 0);
            $capacity = (float) $paper->max_marks * max($appeared, 1);

            $rows[] = [
                'exam_paper_id' => $paper->id,
                'class_room_id' => $paper->class_room_id,
                'appeared' => $appeared,
                'passed' => $passed,
                'pass_rate' => $appeared > 0 ? round(($passed / $appeared) * 100, 2) : 0.0,
                'average_percentage' => $capacity > 0 ? round(($obtained / $capacity) * 100, 2) : 0.0,
            ];
        }

        return [
            'exam_id' => $exam->id,
            'subject_id' => $subjectId,
            'classes' => $rows,
        ];
    }

    /**
     * Achievement per teacher for the classes/subjects they teach in a year.
     *
     * @return array<int, array<string, mixed>>
     */
    public function teacherAnalysis(int $campusId, int $academicYearId, ?int $examId = null): array
    {
        $examQuery = Exam::query()
            ->where('campus_id', $campusId)
            ->where('academic_year_id', $academicYearId);

        if ($examId !== null) {
            $examQuery->whereKey($examId);
        }

        $examIds = $examQuery->pluck('id');

        if ($examIds->isEmpty()) {
            return [];
        }

        $assignments = TeachingAssignment::query()
            ->where('campus_id', $campusId)
            ->where('academic_year_id', $academicYearId)
            ->where('is_active', true)
            ->get();

        $papers = ExamPaper::query()
            ->whereIn('exam_id', $examIds)
            ->get()
            ->keyBy('id');

        $marksByPaper = ExamMark::query()
            ->whereIn('exam_paper_id', $papers->keys())
            ->get()
            ->groupBy('exam_paper_id');

        $teachers = User::query()
            ->whereIn('id', $assignments->pluck('teacher_user_id')->unique())
            ->get()
            ->keyBy('id');

        $result = [];

        foreach ($assignments->groupBy('teacher_user_id') as $teacherId => $teacherAssignments) {
            $appeared = 0;
            $passed = 0;
            $obtained = 0.0;
            $capacity = 0.0;

            foreach ($teacherAssignments as $assignment) {
                foreach ($papers as $paper) {
                    if ($paper->class_room_id !== $assignment->class_room_id
                        || $paper->subject_id !== $assignment->subject_id) {
                        continue;
                    }

                    foreach ($marksByPaper->get($paper->id, collect()) as $mark) {
                        $value = $mark->effective_marks;

                        if ($value === null) {
                            continue;
                        }

                        $appeared++;
                        $obtained += $value;
                        $capacity += (float) $paper->max_marks;

                        if ($value >= (float) $paper->pass_marks) {
                            $passed++;
                        }
                    }
                }
            }

            $result[] = [
                'teacher_id' => (int) $teacherId,
                'teacher' => $teachers->get($teacherId)?->name,
                'appeared' => $appeared,
                'passed' => $passed,
                'pass_rate' => $appeared > 0 ? round(($passed / $appeared) * 100, 2) : 0.0,
                'average_percentage' => $capacity > 0 ? round(($obtained / $capacity) * 100, 2) : 0.0,
            ];
        }

        usort($result, fn (array $a, array $b) => $b['average_percentage'] <=> $a['average_percentage']);

        return $result;
    }

    /**
     * Compare one exam type across academic years for a campus.
     *
     * @return array<int, array<string, mixed>>
     */
    public function yearOnYear(int $campusId, int $examTypeId, ?int $classRoomId = null): array
    {
        $exams = Exam::query()
            ->with('academicYear')
            ->where('campus_id', $campusId)
            ->where('exam_type_id', $examTypeId)
            ->orderBy('academic_year_id')
            ->get();

        $rows = [];

        foreach ($exams as $exam) {
            $papers = ExamPaper::query()
                ->where('exam_id', $exam->id)
                ->when($classRoomId !== null, fn ($q) => $q->where('class_room_id', $classRoomId))
                ->get();

            if ($papers->isEmpty()) {
                continue;
            }

            $marks = ExamMark::query()
                ->whereIn('exam_paper_id', $papers->pluck('id'))
                ->where('is_absent', false)
                ->whereNotNull('marks_obtained')
                ->get();

            $maxByPaper = $papers->pluck('max_marks', 'id');
            $obtained = (float) $marks->sum(fn (ExamMark $m) => $m->effective_marks ?? 0);
            $capacity = (float) $marks->sum(fn (ExamMark $m) => (float) ($maxByPaper[$m->exam_paper_id] ?? 0));

            $rows[] = [
                'exam_id' => $exam->id,
                'academic_year_id' => $exam->academic_year_id,
                'academic_year' => $exam->academicYear?->name,
                'appeared' => $marks->count(),
                'average_percentage' => $capacity > 0 ? round(($obtained / $capacity) * 100, 2) : 0.0,
            ];
        }

        return $rows;
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function studentTotals(Exam $exam, int $classRoomId): Collection
    {
        $studentIds = StudentEnrollment::query()
            ->where('academic_year_id', $exam->academic_year_id)
            ->where('class_room_id', $classRoomId)
            ->where('status', 'active')
            ->pluck('student_id');

        $totals = ExamMark::query()
            ->where('exam_id', $exam->id)
            ->whereIn('student_id', $studentIds)
            ->where('is_absent', false)
            ->selectRaw('student_id, SUM(COALESCE(moderated_marks_obtained, marks_obtained)) as total')
            ->groupBy('student_id')
            ->pluck('total', 'student_id');

        $maxTotal = (float) ExamPaper::query()
            ->where('exam_id', $exam->id)
            ->where('class_room_id', $classRoomId)
            ->sum('max_marks');

        return $studentIds->map(fn ($studentId) => [
            'student_id' => (int) $studentId,
            'total_obtained' => round((float) ($totals[$studentId] ?? 0), 2),
            'percentage' => $maxTotal > 0 ? round(((float) ($totals[$studentId] ?? 0) / $maxTotal) * 100, 2) : 0.0,
        ])->values();
    }
}
