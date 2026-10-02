<?php

namespace App\Http\Controllers\Api;

use App\Enums\VoucherStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\FeeVoucherResource;
use App\Http\Resources\StudentAttendanceResource;
use App\Http\Resources\StudentResource;
use App\Http\Resources\TimetableSlotResource;
use App\Models\Exam;
use App\Models\FeeVoucher;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\StudentAttendance;
use App\Models\StudentEnrollment;
use App\Models\TimetableSlot;
use App\Services\Attendance\AttendanceService;
use App\Services\Exams\ResultService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;

/**
 * Self-service endpoints for the signed-in student or parent. Every request is
 * resolved against the student records linked to the acting user so a portal
 * account can only ever read its own (or its children's) data.
 *
 * These routes are deliberately not gated by the staff module permissions
 * (timetable.view, fee.view, ...): a portal account is authorized by its linked
 * student record alone, so a student can see their own fees without being
 * granted campus-wide fee access.
 */
class PortalController extends Controller
{
    public function children(Request $request): AnonymousResourceCollection
    {
        $students = $this->actingStudents($request)->load([
            'enrollments.academicYear', 'enrollments.classRoom', 'enrollments.section', 'user',
        ]);

        return StudentResource::collection($students);
    }

    public function timetable(Request $request): AnonymousResourceCollection
    {
        $student = $this->studentOrFail($request);
        $enrollment = $this->currentEnrollment($student, $request->integer('academic_year_id') ?: null);

        if ($enrollment === null) {
            return TimetableSlotResource::collection(collect());
        }

        $slots = TimetableSlot::query()
            ->where('class_room_id', $enrollment->class_room_id)
            ->when($enrollment->section_id, fn ($q, $sectionId) => $q->where('section_id', $sectionId))
            ->where('academic_year_id', $enrollment->academic_year_id)
            ->where('is_published', true)
            ->when($request->filled('term_id'), fn ($q) => $q->where('term_id', $request->integer('term_id')))
            ->orderBy('day_of_week')
            ->orderBy('period_id')
            ->with(['period', 'subject', 'teacher', 'classRoom', 'section', 'room'])
            ->get();

        return TimetableSlotResource::collection($slots);
    }

    public function attendance(Request $request, AttendanceService $attendance): JsonResponse
    {
        $student = $this->studentOrFail($request);

        $from = $request->filled('from')
            ? $request->date('from')->toDateString()
            : now()->startOfMonth()->toDateString();
        $to = $request->filled('to') ? $request->date('to')->toDateString() : now()->toDateString();

        $records = StudentAttendance::query()
            ->where('student_id', $student->id)
            ->whereBetween('attendance_date', [$from, $to])
            ->with(['classRoom', 'section'])
            ->orderByDesc('attendance_date')
            ->limit(120)
            ->get();

        return response()->json([
            'student' => $this->studentBrief($student),
            'summary' => $attendance->studentSummary($student->id, $from, $to),
            'data' => StudentAttendanceResource::collection($records),
        ]);
    }

    public function results(Request $request, ResultService $results): JsonResponse
    {
        $student = $this->studentOrFail($request);
        $enrollment = $this->currentEnrollment($student, $request->integer('academic_year_id') ?: null);

        $exams = Exam::query()
            ->when(
                $enrollment !== null,
                fn ($q) => $q->where('academic_year_id', $enrollment->academic_year_id)
            )
            ->orderByDesc('starts_on')
            ->orderByDesc('id')
            ->get();

        $cards = $exams
            ->map(function (Exam $exam) use ($student, $results): array {
                $card = $results->resultCard($student, $exam);
                $card['exam'] = [
                    'id' => $exam->id,
                    'name' => $exam->name,
                    'starts_on' => $exam->starts_on?->toDateString(),
                    'ends_on' => $exam->ends_on?->toDateString(),
                ];

                return $card;
            })
            ->values();

        return response()->json([
            'student' => $this->studentBrief($student),
            'data' => $cards,
        ]);
    }

    public function fees(Request $request): JsonResponse
    {
        $student = $this->studentOrFail($request);

        $vouchers = FeeVoucher::query()
            ->where('student_id', $student->id)
            ->whereIn('status', [
                VoucherStatus::Unpaid->value,
                VoucherStatus::Partial->value,
                VoucherStatus::Paid->value,
            ])
            ->orderBy('due_date')
            ->orderBy('id')
            ->get();

        $billed = (float) $vouchers->sum('amount');
        $paid = (float) $vouchers->sum('paid_amount');

        return response()->json([
            'student' => $this->studentBrief($student),
            'totals' => [
                'billed' => number_format($billed, 2, '.', ''),
                'paid' => number_format($paid, 2, '.', ''),
                'outstanding' => number_format(max($billed - $paid, 0), 2, '.', ''),
            ],
            'data' => FeeVoucherResource::collection($vouchers),
        ]);
    }

    /**
     * Students linked to the acting user: the user's own student record, or the
     * children of a parent/guardian account.
     *
     * @return Collection<int, Student>
     */
    private function actingStudents(Request $request): Collection
    {
        $user = $request->user();

        $own = Student::query()->where('user_id', $user->id)->get();

        if ($own->isNotEmpty()) {
            return $own;
        }

        $guardianIds = Guardian::query()->where('user_id', $user->id)->pluck('id');

        if ($guardianIds->isEmpty()) {
            return new Collection();
        }

        return Student::query()
            ->whereHas('guardians', fn ($q) => $q->whereIn('guardians.id', $guardianIds))
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get();
    }

    private function studentOrFail(Request $request): Student
    {
        $students = $this->actingStudents($request);

        if ($students->isEmpty()) {
            abort(403, 'No student profile is linked to your account.');
        }

        $studentId = $request->integer('student_id') ?: null;

        $student = $studentId !== null
            ? $students->firstWhere('id', $studentId)
            : $students->first();

        if ($student === null) {
            abort(404, 'Student not found.');
        }

        return $student;
    }

    private function currentEnrollment(Student $student, ?int $academicYearId): ?StudentEnrollment
    {
        return StudentEnrollment::query()
            ->where('student_id', $student->id)
            ->when($academicYearId !== null, fn ($q) => $q->where('academic_year_id', $academicYearId))
            ->orderByDesc('starts_on')
            ->orderByDesc('id')
            ->first();
    }

    /**
     * @return array{id: int, name: string, admission_no: string, photo_url: ?string}
     */
    private function studentBrief(Student $student): array
    {
        return [
            'id' => $student->id,
            'name' => $student->full_name,
            'admission_no' => $student->admission_no,
            'photo_url' => $student->photo_path
                ? Storage::disk('public')->url($student->photo_path)
                : null,
        ];
    }
}
