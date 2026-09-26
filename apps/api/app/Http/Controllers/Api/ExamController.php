<?php

namespace App\Http\Controllers\Api;

use App\Enums\ExamStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ExamResource;
use App\Models\Exam;
use App\Services\Exams\ResultService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ExamController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly ResultService $results) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $exams = Exam::query()
            ->with('examType')
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->when($request->filled('exam_type_id'), fn ($q) => $q->where('exam_type_id', $request->integer('exam_type_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('starts_on')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return ExamResource::collection($exams);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $exam = Exam::create($data + $tenant);

        return (new ExamResource($exam->load('examType')))->response()->setStatusCode(201);
    }

    public function show(Exam $exam): ExamResource
    {
        return new ExamResource($exam->load(['examType', 'papers.subject', 'papers.classRoom']));
    }

    public function update(Request $request, Exam $exam): ExamResource
    {
        $data = $request->validate($this->rules($exam->campus_id, false));

        $exam->update($data);

        return new ExamResource($exam->load('examType'));
    }

    public function destroy(Exam $exam): JsonResponse
    {
        $exam->delete();

        return response()->json(['message' => 'Exam removed.']);
    }

    public function publish(Exam $exam): ExamResource
    {
        $exam->forceFill(['status' => ExamStatus::Published])->save();

        return new ExamResource($exam->load('examType'));
    }

    public function meritList(Request $request, Exam $exam): JsonResponse
    {
        $data = $request->validate([
            'class_room_id' => [
                'required', 'integer',
                Rule::exists('class_rooms', 'id')->where('campus_id', $exam->campus_id),
            ],
        ]);

        return response()->json([
            'data' => $this->results->meritList($exam, (int) $data['class_room_id']),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'academic_year_id' => [$presence, 'integer', Rule::exists('academic_years', 'id')->where('campus_id', $campusId)],
            'term_id' => ['nullable', 'integer', Rule::exists('terms', 'id')->where('campus_id', $campusId)],
            'exam_type_id' => [$presence, 'integer', Rule::exists('exam_types', 'id')->where('campus_id', $campusId)],
            'name' => [$presence, 'string', 'max:255'],
            'starts_on' => [$presence, 'date'],
            'ends_on' => [$presence, 'date', 'after_or_equal:starts_on'],
            'status' => ['sometimes', Rule::enum(ExamStatus::class)],
            'description' => ['nullable', 'string'],
        ];
    }
}
