<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ExamMarkResource;
use App\Models\Exam;
use App\Models\ExamMark;
use App\Models\ExamPaper;
use App\Models\Student;
use App\Services\Exams\ResultService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ExamMarkController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly ResultService $results) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $marks = ExamMark::query()
            ->with(['student', 'subject'])
            ->when($request->filled('exam_paper_id'), fn ($q) => $q->where('exam_paper_id', $request->integer('exam_paper_id')))
            ->when($request->filled('exam_id'), fn ($q) => $q->where('exam_id', $request->integer('exam_id')))
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->orderBy('student_id')
            ->paginate($request->integer('per_page', 200));

        return ExamMarkResource::collection($marks);
    }

    public function bulkStore(Request $request): JsonResponse
    {
        $data = $request->validate([
            'exam_paper_id' => ['required', 'integer', Rule::exists('exam_papers', 'id')->whereNull('deleted_at')],
            'marks' => ['required', 'array', 'min:1'],
            'marks.*.student_id' => ['required', 'integer', Rule::exists('students', 'id')->whereNull('deleted_at')],
            'marks.*.marks_obtained' => ['nullable', 'numeric', 'min:0'],
            'marks.*.is_absent' => ['sometimes', 'boolean'],
            'marks.*.remarks' => ['nullable', 'string', 'max:255'],
        ]);

        $tenant = $this->academicTenantAttributes();
        $paper = ExamPaper::query()->whereKey($data['exam_paper_id'])->firstOrFail();

        if ($paper->campus_id !== $tenant['campus_id']) {
            abort(403, 'This paper belongs to another campus.');
        }

        $maxMarks = (float) $paper->max_marks;

        $saved = DB::transaction(function () use ($data, $paper, $tenant, $maxMarks) {
            $enteredBy = auth()->id();
            $rows = [];

            foreach ($data['marks'] as $row) {
                $isAbsent = (bool) ($row['is_absent'] ?? false);
                $obtained = $isAbsent ? null : ($row['marks_obtained'] ?? null);

                if (! $isAbsent && $obtained !== null && (float) $obtained > $maxMarks) {
                    throw ValidationException::withMessages([
                        'marks' => ["Marks for student {$row['student_id']} exceed the paper maximum of {$maxMarks}."],
                    ]);
                }

                $rows[] = ExamMark::updateOrCreate(
                    [
                        'exam_paper_id' => $paper->id,
                        'student_id' => $row['student_id'],
                    ],
                    [
                        'institution_id' => $tenant['institution_id'],
                        'campus_id' => $tenant['campus_id'],
                        'exam_id' => $paper->exam_id,
                        'class_room_id' => $paper->class_room_id,
                        'subject_id' => $paper->subject_id,
                        'entered_by' => $enteredBy,
                        'marks_obtained' => $obtained,
                        'is_absent' => $isAbsent,
                        'remarks' => $row['remarks'] ?? null,
                    ],
                );
            }

            return $rows;
        });

        return response()->json([
            'message' => 'Marks saved.',
            'data' => ExamMarkResource::collection(
                ExamMark::query()
                    ->with('student')
                    ->whereIn('id', collect($saved)->pluck('id'))
                    ->get(),
            ),
        ]);
    }

    public function resultCard(Exam $exam, Student $student): JsonResponse
    {
        return response()->json([
            'data' => $this->results->resultCard($student, $exam),
        ]);
    }
}
