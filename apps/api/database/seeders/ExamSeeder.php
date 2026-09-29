<?php

namespace Database\Seeders;

use App\Enums\ExamStatus;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\ClassRoom;
use App\Models\Exam;
use App\Models\ExamMark;
use App\Models\ExamPaper;
use App\Models\ExamType;
use App\Models\GradeScale;
use App\Models\Institution;
use App\Models\StudentEnrollment;
use App\Models\Subject;
use App\Models\Term;
use App\Models\User;
use Illuminate\Database\Seeder;

class ExamSeeder extends Seeder
{
    /**
     * Seed a completed terminal exam with grade scale, papers and marks for
     * the demo campus so exam and report screens have data on a fresh install.
     */
    public function run(): void
    {
        $institution = Institution::query()->where('code', 'DEMO-TRUST')->first();

        if ($institution === null) {
            return;
        }

        $campus = Campus::query()
            ->where('institution_id', $institution->id)
            ->where('code', 'MAIN')
            ->first();

        $teacher = User::query()->where('email', 'teacher@demo-eis.test')->first();

        $year = AcademicYear::query()
            ->where('campus_id', $campus?->id)
            ->where('is_current', true)
            ->first();

        $class = ClassRoom::query()
            ->where('campus_id', $campus?->id)
            ->where('code', 'C1')
            ->first();

        if ($campus === null || $teacher === null || $year === null || $class === null) {
            return;
        }

        $tenant = ['institution_id' => $institution->id, 'campus_id' => $campus->id];

        $term = Term::query()
            ->where('academic_year_id', $year->id)
            ->orderBy('sequence')
            ->first();

        $examType = ExamType::firstOrCreate(
            ['campus_id' => $campus->id, 'code' => 'TERM'],
            $tenant + [
                'name' => 'Terminal Examination',
                'weightage' => 100,
                'is_active' => true,
            ]
        );

        $scale = GradeScale::firstOrCreate(
            ['campus_id' => $campus->id, 'code' => 'PCT'],
            $tenant + [
                'name' => 'Percentage Grading',
                'is_default' => true,
                'is_active' => true,
            ]
        );

        if ($scale->items()->count() === 0) {
            $grades = [
                ['A+', 90, 100, 4.0], ['A', 80, 89.99, 3.7], ['B', 70, 79.99, 3.3],
                ['C', 60, 69.99, 3.0], ['D', 50, 59.99, 2.0], ['E', 40, 49.99, 1.0],
                ['F', 0, 39.99, 0.0],
            ];

            foreach ($grades as $index => [$grade, $min, $max, $points]) {
                $scale->items()->create([
                    'sequence' => $index + 1,
                    'grade' => $grade,
                    'min_percentage' => $min,
                    'max_percentage' => $max,
                    'points' => $points,
                ]);
            }
        }

        $exam = Exam::firstOrCreate(
            ['campus_id' => $campus->id, 'name' => 'Terminal Examination 2026'],
            $tenant + [
                'academic_year_id' => $year->id,
                'term_id' => $term?->id,
                'exam_type_id' => $examType->id,
                'starts_on' => '2026-06-10',
                'ends_on' => '2026-06-20',
                'status' => ExamStatus::Completed,
            ]
        );

        $subjects = Subject::query()
            ->where('campus_id', $campus->id)
            ->whereIn('code', ['ENG', 'MATH', 'SCI'])
            ->pluck('id', 'code');

        $studentIds = StudentEnrollment::query()
            ->where('class_room_id', $class->id)
            ->where('academic_year_id', $year->id)
            ->orderBy('student_id')
            ->pluck('student_id')
            ->values();

        $scorecard = [
            'ENG' => [78, 88, 66, 91],
            'MATH' => [64, 92, 48, 73],
            'SCI' => [55, 71, null, 83],
        ];

        foreach ($subjects as $code => $subjectId) {
            $paper = ExamPaper::firstOrCreate(
                ['exam_id' => $exam->id, 'class_room_id' => $class->id, 'subject_id' => $subjectId],
                $tenant + [
                    'exam_date' => '2026-06-12',
                    'max_marks' => 100,
                    'pass_marks' => 40,
                ]
            );

            $scores = $scorecard[$code] ?? [];

            foreach ($studentIds as $index => $studentId) {
                $marks = $scores[$index] ?? null;

                ExamMark::updateOrCreate(
                    ['exam_paper_id' => $paper->id, 'student_id' => $studentId],
                    $tenant + [
                        'exam_id' => $exam->id,
                        'class_room_id' => $class->id,
                        'subject_id' => $subjectId,
                        'entered_by' => $teacher->id,
                        'marks_obtained' => $marks,
                        'is_absent' => $marks === null,
                    ]
                );
            }
        }
    }
}
