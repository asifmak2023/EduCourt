<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ExamReevaluationResource;
use App\Models\ExamMark;
use App\Models\ExamPaper;
use App\Models\ExamReevaluation;
use App\Services\Exams\ExamAdjustmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ExamReevaluationController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly ExamAdjustmentService $adjustments) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $reevaluations = ExamReevaluation::query()
            ->with(['exam', 'paper', 'student'])
            ->when($request->filled('exam_id'), fn ($q) => $q->where('exam_id', $request->integer('exam_id')))
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return ExamReevaluationResource::collection($reevaluations);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'exam_paper_id' => ['required', 'integer', Rule::exists('exam_papers', 'id')->whereNull('deleted_at')],
            'student_id' => ['required', 'integer', Rule::exists('students', 'id')->whereNull('deleted_at')],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $paper = ExamPaper::query()->whereKey($data['exam_paper_id'])->firstOrFail();

        if ($paper->campus_id !== $tenant['campus_id']) {
            abort(403, 'This paper belongs to another campus.');
        }

        $mark = ExamMark::query()
            ->where('exam_paper_id', $paper->id)
            ->where('student_id', $data['student_id'])
            ->first();

        $reevaluation = ExamReevaluation::create($data + $tenant + [
            'exam_id' => $paper->exam_id,
            'status' => 'requested',
            'original_marks' => $mark?->effective_marks,
            'requested_by' => $request->user()?->id,
        ]);

        return (new ExamReevaluationResource($reevaluation->load(['exam', 'paper', 'student'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(ExamReevaluation $reevaluation): ExamReevaluationResource
    {
        return new ExamReevaluationResource($reevaluation->load(['exam', 'paper', 'student']));
    }

    public function review(Request $request, ExamReevaluation $reevaluation): ExamReevaluationResource
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['under_review', 'approved', 'rejected'])],
            'revised_marks' => ['nullable', 'numeric', 'min:0'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ]);

        $reevaluation = $this->adjustments->applyReevaluation($reevaluation, $data, (int) $request->user()?->id);

        return new ExamReevaluationResource($reevaluation->load(['exam', 'paper', 'student']));
    }

    public function destroy(ExamReevaluation $reevaluation): JsonResponse
    {
        $reevaluation->delete();

        return response()->json(['message' => 'Re-evaluation request removed.']);
    }
}
