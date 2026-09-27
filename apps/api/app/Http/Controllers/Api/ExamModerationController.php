<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ExamModerationResource;
use App\Models\ExamModeration;
use App\Models\ExamPaper;
use App\Services\Exams\ExamAdjustmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ExamModerationController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly ExamAdjustmentService $adjustments) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $moderations = ExamModeration::query()
            ->with(['exam', 'paper'])
            ->when($request->filled('exam_id'), fn ($q) => $q->where('exam_id', $request->integer('exam_id')))
            ->when($request->filled('exam_paper_id'), fn ($q) => $q->where('exam_paper_id', $request->integer('exam_paper_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return ExamModerationResource::collection($moderations);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'exam_paper_id' => ['required', 'integer', Rule::exists('exam_papers', 'id')->whereNull('deleted_at')],
            'type' => ['required', Rule::in(['grace_marks', 'scaling'])],
            'value' => ['required', 'numeric'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $paper = ExamPaper::query()->whereKey($data['exam_paper_id'])->firstOrFail();

        if ($paper->campus_id !== $tenant['campus_id']) {
            abort(403, 'This paper belongs to another campus.');
        }

        if ($data['type'] === 'grace_marks' && (float) $data['value'] <= 0) {
            abort(422, 'Grace marks must be greater than zero.');
        }

        $moderation = ExamModeration::create($data + $tenant + [
            'exam_id' => $paper->exam_id,
            'status' => 'pending',
            'created_by' => $request->user()?->id,
        ]);

        return (new ExamModerationResource($moderation->load(['exam', 'paper'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(ExamModeration $moderation): ExamModerationResource
    {
        return new ExamModerationResource($moderation->load(['exam', 'paper']));
    }

    public function approve(Request $request, ExamModeration $moderation): ExamModerationResource
    {
        $moderation = $this->adjustments->approveModeration($moderation, (int) $request->user()?->id);

        return new ExamModerationResource($moderation->load(['exam', 'paper']));
    }

    public function apply(ExamModeration $moderation): ExamModerationResource
    {
        $moderation = $this->adjustments->applyModeration($moderation);

        return new ExamModerationResource($moderation->load(['exam', 'paper']));
    }

    public function reject(ExamModeration $moderation): ExamModerationResource
    {
        $moderation = $this->adjustments->rejectModeration($moderation);

        return new ExamModerationResource($moderation->load(['exam', 'paper']));
    }

    public function destroy(ExamModeration $moderation): JsonResponse
    {
        if ($moderation->status->value === 'applied') {
            abort(422, 'An applied moderation cannot be deleted.');
        }

        $moderation->delete();

        return response()->json(['message' => 'Moderation removed.']);
    }
}
