<?php

namespace App\Services\Academics;

use App\Enums\CourseRegistrationStatus;
use App\Models\ClassRoom;
use App\Models\CourseRegistration;
use App\Models\Exam;
use App\Models\ExamMark;
use App\Models\GradeScale;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Term;
use App\Services\Exams\ResultService;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Credit-hour model for college and university campuses: course registration per
 * term/semester plus credit-weighted GPA and transcript computation.
 */
class CreditService
{
    public function __construct(private readonly ResultService $results) {}

    /**
     * @param  array{institution_id: int, campus_id: int}  $tenant
     */
    public function register(
        array $tenant,
        Student $student,
        Term $term,
        Subject $subject,
        ?ClassRoom $classRoom = null,
        ?float $creditHours = null,
        ?string $remarks = null,
    ): CourseRegistration {
        if ((int) $student->campus_id !== (int) $tenant['campus_id']) {
            abort(403, 'This student belongs to another campus.');
        }

        if ((int) $term->campus_id !== (int) $tenant['campus_id']) {
            abort(403, 'This term belongs to another campus.');
        }

        if ((int) $subject->campus_id !== (int) $tenant['campus_id']) {
            abort(403, 'This subject belongs to another campus.');
        }

        $existing = CourseRegistration::withTrashed()
            ->where('student_id', $student->id)
            ->where('term_id', $term->id)
            ->where('subject_id', $subject->id)
            ->first();

        if ($existing !== null && ! $existing->trashed()) {
            throw ValidationException::withMessages([
                'subject_id' => 'This subject is already registered for the selected term.',
            ]);
        }

        $attributes = $tenant + [
            'student_id' => $student->id,
            'term_id' => $term->id,
            'class_room_id' => $classRoom?->id,
            'subject_id' => $subject->id,
            'credit_hours' => $creditHours ?? (float) ($subject->credit_hours ?? 1.0),
            'status' => CourseRegistrationStatus::Registered,
            'registered_on' => now()->toDateString(),
            'remarks' => $remarks,
        ];

        if ($existing !== null) {
            $existing->restore();
            $existing->forceFill($attributes)->save();

            return $existing->refresh();
        }

        return CourseRegistration::create($attributes);
    }

    public function drop(CourseRegistration $registration): CourseRegistration
    {
        if ($registration->status === CourseRegistrationStatus::Dropped) {
            return $registration;
        }

        $registration->forceFill(['status' => CourseRegistrationStatus::Dropped])->save();

        return $registration->refresh();
    }

    /**
     * Credit-weighted GPA for a student in a single term/semester.
     *
     * @return array<string, mixed>
     */
    public function termGpa(Student $student, Term $term, ?GradeScale $scale = null): array
    {
        $scale ??= $this->results->defaultScale((int) $term->campus_id);
        $scale?->loadMissing('items');

        $registrations = CourseRegistration::query()
            ->with('subject')
            ->where('student_id', $student->id)
            ->where('term_id', $term->id)
            ->where('status', '!=', CourseRegistrationStatus::Dropped->value)
            ->orderBy('subject_id')
            ->get();

        $marksBySubject = $this->termMarks($student, $term);

        $subjects = [];
        $qualityPoints = 0.0;
        $gradedCredits = 0.0;
        $earnedCredits = 0.0;

        foreach ($registrations as $registration) {
            $credits = (float) $registration->credit_hours;

            $percentages = $marksBySubject->get($registration->subject_id, collect());
            $percentage = $percentages->isNotEmpty() ? round($percentages->avg(), 2) : null;
            $item = $percentage === null ? null : $scale?->gradeFor($percentage);
            $points = $item === null ? null : (float) $item->points;

            if ($points !== null) {
                $qualityPoints += $points * $credits;
                $gradedCredits += $credits;

                if ($points > 0) {
                    $earnedCredits += $credits;
                }
            }

            $subjects[] = [
                'course_registration_id' => $registration->id,
                'subject_id' => $registration->subject_id,
                'subject' => $registration->subject?->name,
                'credit_hours' => $credits,
                'percentage' => $percentage,
                'grade' => $item?->grade,
                'grade_points' => $points,
                'status' => $registration->status?->value,
            ];
        }

        return [
            'term' => [
                'id' => $term->id,
                'name' => $term->name,
                'academic_year_id' => $term->academic_year_id,
            ],
            'student_id' => $student->id,
            'credits_registered' => round($registrations->sum(fn ($r) => (float) $r->credit_hours), 1),
            'credits_graded' => round($gradedCredits, 1),
            'credits_earned' => round($earnedCredits, 1),
            'gpa' => $gradedCredits > 0 ? round($qualityPoints / $gradedCredits, 2) : null,
            'subjects' => $subjects,
        ];
    }

    /**
     * Cumulative GPA and per-term breakdown across every term the student has
     * registered in.
     *
     * @return array<string, mixed>
     */
    public function transcript(Student $student): array
    {
        $termIds = CourseRegistration::query()
            ->where('student_id', $student->id)
            ->where('status', '!=', CourseRegistrationStatus::Dropped->value)
            ->distinct()
            ->pluck('term_id');

        $terms = Term::query()
            ->whereIn('id', $termIds)
            ->orderBy('starts_on')
            ->get();

        $rows = [];
        $totalQuality = 0.0;
        $totalCredits = 0.0;
        $earnedCredits = 0.0;

        foreach ($terms as $term) {
            $row = $this->termGpa($student, $term);
            $rows[] = $row;

            $totalCredits += $row['credits_graded'];
            $earnedCredits += $row['credits_earned'];

            if ($row['gpa'] !== null) {
                $totalQuality += $row['gpa'] * $row['credits_graded'];
            }
        }

        return [
            'student_id' => $student->id,
            'student' => $student->full_name ?? trim($student->first_name.' '.$student->last_name),
            'terms' => $rows,
            'credits_earned' => round($earnedCredits, 1),
            'gpa' => $totalCredits > 0 ? round($totalQuality / $totalCredits, 2) : null,
        ];
    }

    /**
     * Percentage scored by the student per registered subject in a term,
     * averaging across that term's papers for the subject.
     *
     * @return Collection<int, Collection<int, float>>
     */
    private function termMarks(Student $student, Term $term): Collection
    {
        $examIds = Exam::query()->where('term_id', $term->id)->pluck('id');

        if ($examIds->isEmpty()) {
            return collect();
        }

        return ExamMark::query()
            ->with('paper')
            ->whereIn('exam_id', $examIds)
            ->where('student_id', $student->id)
            ->get()
            ->groupBy('subject_id')
            ->map(fn (Collection $marks) => $marks
                ->map(function (ExamMark $mark) {
                    $max = (float) ($mark->paper?->max_marks ?? 0);
                    $obtained = $mark->effective_marks;

                    return $max > 0 && $obtained !== null ? $obtained / $max * 100 : null;
                })
                ->filter(fn ($value) => $value !== null)
                ->values()
            );
    }
}
