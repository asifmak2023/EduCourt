<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ExamPaperResource;
use App\Models\ExamPaper;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ExamPaperController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $papers = ExamPaper::query()
            ->with(['subject', 'classRoom', 'room', 'duties.user'])
            ->when($request->filled('exam_id'), fn ($q) => $q->where('exam_id', $request->integer('exam_id')))
            ->when($request->filled('class_room_id'), fn ($q) => $q->where('class_room_id', $request->integer('class_room_id')))
            ->when($request->filled('subject_id'), fn ($q) => $q->where('subject_id', $request->integer('subject_id')))
            ->orderBy('exam_date')
            ->orderBy('starts_at')
            ->paginate($request->integer('per_page', 50));

        return ExamPaperResource::collection($papers);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));
        $data += $tenant;

        $paper = ExamPaper::create($data);

        return (new ExamPaperResource($paper->load(['subject', 'classRoom', 'room'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(ExamPaper $examPaper): ExamPaperResource
    {
        return new ExamPaperResource($examPaper->load(['subject', 'classRoom', 'room', 'duties.user']));
    }

    public function update(Request $request, ExamPaper $examPaper): ExamPaperResource
    {
        $data = $request->validate($this->rules($examPaper->campus_id, $examPaper->id, false));

        $examPaper->update($data);

        return new ExamPaperResource($examPaper->load(['subject', 'classRoom', 'room']));
    }

    public function destroy(ExamPaper $examPaper): JsonResponse
    {
        $examPaper->delete();

        return response()->json(['message' => 'Exam paper removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, ?int $ignoreId = null, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'exam_id' => [
                $presence, 'integer',
                Rule::exists('exams', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'class_room_id' => [
                $presence, 'integer',
                Rule::exists('class_rooms', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'subject_id' => [
                $presence, 'integer',
                Rule::exists('subjects', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'room_id' => ['nullable', 'integer', Rule::exists('rooms', 'id')->where('campus_id', $campusId)],
            'exam_date' => [$presence, 'date'],
            'starts_at' => ['nullable', 'date_format:H:i'],
            'ends_at' => ['nullable', 'date_format:H:i', 'after:starts_at'],
            'max_marks' => ['sometimes', 'numeric', 'min:0'],
            'pass_marks' => ['sometimes', 'numeric', 'min:0', 'lte:max_marks'],
        ];
    }
}
