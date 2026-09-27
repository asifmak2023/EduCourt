<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ExamSupplementaryResource;
use App\Models\Exam;
use App\Models\ExamPaper;
use App\Models\ExamSupplementary;
use App\Services\Exams\ExamAdjustmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ExamSupplementaryController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly ExamAdjustmentService $adjustments) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $supplementaries = ExamSupplementary::query()
            ->with(['originalExam', 'exam', 'student', 'subject'])
            ->when($request->filled('original_exam_id'), fn ($q) => $q->where('original_exam_id', $request->integer('original_exam_id')))
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return ExamSupplementaryResource::collection($supplementaries);
    }

    public function eligible(Request $request, Exam $exam): JsonResponse
    {
        $data = $request->validate([
            'class_room_id' => ['required', 'integer', Rule::exists('class_rooms', 'id')],
        ]);

        return response()->json([
            'data' => $this->adjustments->failedStudents($exam, (int) $data['class_room_id']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'original_exam_id' => ['required', 'integer', Rule::exists('exams', 'id')->whereNull('deleted_at')],
            'exam_id' => ['nullable', 'integer', Rule::exists('exams', 'id')->whereNull('deleted_at')],
            'exam_paper_id' => ['nullable', 'integer', Rule::exists('exam_papers', 'id')->whereNull('deleted_at')],
            'student_id' => ['required', 'integer', Rule::exists('students', 'id')->whereNull('deleted_at')],
            'subject_id' => ['nullable', 'integer', Rule::exists('subjects', 'id')->whereNull('deleted_at')],
            'fee_amount' => ['sometimes', 'numeric', 'min:0'],
            'is_paid' => ['sometimes', 'boolean'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ]);

        $original = Exam::query()->whereKey($data['original_exam_id'])->firstOrFail();

        if ($original->campus_id !== $tenant['campus_id']) {
            abort(403, 'This exam belongs to another campus.');
        }

        if (! empty($data['exam_paper_id'])) {
            $paper = ExamPaper::query()->whereKey($data['exam_paper_id'])->firstOrFail();
            $data['subject_id'] = $data['subject_id'] ?? $paper->subject_id;
        }

        $supplementary = ExamSupplementary::create($data + $tenant + [
            'status' => 'registered',
        ]);

        return (new ExamSupplementaryResource($supplementary->load(['originalExam', 'exam', 'student', 'subject'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(ExamSupplementary $supplementary): ExamSupplementaryResource
    {
        return new ExamSupplementaryResource($supplementary->load(['originalExam', 'exam', 'student', 'subject']));
    }

    public function approve(Request $request, ExamSupplementary $supplementary): ExamSupplementaryResource
    {
        if ($supplementary->status->value !== 'registered') {
            abort(422, 'Only registered supplementary exams can be approved.');
        }

        $supplementary->forceFill([
            'status' => 'approved',
            'approved_by' => $request->user()?->id,
            'approved_at' => now(),
        ])->save();

        return new ExamSupplementaryResource($supplementary->refresh()->load(['originalExam', 'exam', 'student', 'subject']));
    }

    public function reject(ExamSupplementary $supplementary): ExamSupplementaryResource
    {
        if ($supplementary->status->value === 'completed') {
            abort(422, 'A completed supplementary exam cannot be rejected.');
        }

        $supplementary->forceFill(['status' => 'rejected'])->save();

        return new ExamSupplementaryResource($supplementary->refresh()->load(['originalExam', 'exam', 'student', 'subject']));
    }

    public function complete(ExamSupplementary $supplementary): ExamSupplementaryResource
    {
        $supplementary->forceFill(['status' => 'completed'])->save();

        return new ExamSupplementaryResource($supplementary->refresh()->load(['originalExam', 'exam', 'student', 'subject']));
    }

    public function destroy(ExamSupplementary $supplementary): JsonResponse
    {
        $supplementary->delete();

        return response()->json(['message' => 'Supplementary registration removed.']);
    }
}
