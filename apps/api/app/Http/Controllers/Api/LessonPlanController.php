<?php

namespace App\Http\Controllers\Api;

use App\Enums\LessonPlanStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\LessonPlanResource;
use App\Models\LessonPlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class LessonPlanController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $plans = LessonPlan::query()
            ->with(['subject', 'classRoom', 'syllabusUnit'])
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->when($request->filled('class_room_id'), fn ($q) => $q->where('class_room_id', $request->integer('class_room_id')))
            ->when($request->filled('subject_id'), fn ($q) => $q->where('subject_id', $request->integer('subject_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('created_by'), fn ($q) => $q->where('created_by', $request->integer('created_by')))
            ->orderByDesc('planned_from')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return LessonPlanResource::collection($plans);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));
        $data += $tenant;
        $data['created_by'] = $request->user()->id;
        $data['status'] = LessonPlanStatus::Draft;

        $plan = LessonPlan::create($data);

        return (new LessonPlanResource($plan->load(['subject', 'classRoom', 'syllabusUnit'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(LessonPlan $lessonPlan): LessonPlanResource
    {
        return new LessonPlanResource($lessonPlan->load(['subject', 'classRoom', 'syllabusUnit']));
    }

    public function update(Request $request, LessonPlan $lessonPlan): LessonPlanResource
    {
        $data = $request->validate($this->rules($lessonPlan->campus_id, false));

        if (isset($data['status'])) {
            $status = LessonPlanStatus::from($data['status']);
            abort_if($status === LessonPlanStatus::Approved, 422, 'Use the approve endpoint to approve a lesson plan.');
        }

        $lessonPlan->update($data);

        return new LessonPlanResource($lessonPlan->load(['subject', 'classRoom', 'syllabusUnit']));
    }

    public function approve(Request $request, LessonPlan $lessonPlan): LessonPlanResource
    {
        if ($lessonPlan->status === LessonPlanStatus::Approved) {
            return new LessonPlanResource($lessonPlan->load(['subject', 'classRoom', 'syllabusUnit']));
        }

        $lessonPlan->update([
            'status' => LessonPlanStatus::Approved,
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        return new LessonPlanResource($lessonPlan->load(['subject', 'classRoom', 'syllabusUnit']));
    }

    public function destroy(LessonPlan $lessonPlan): JsonResponse
    {
        $lessonPlan->delete();

        return response()->json(['message' => 'Lesson plan removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'academic_year_id' => [$presence, 'integer', Rule::exists('academic_years', 'id')->where('campus_id', $campusId)],
            'class_room_id' => [$presence, 'integer', Rule::exists('class_rooms', 'id')->where('campus_id', $campusId)],
            'subject_id' => [$presence, 'integer', Rule::exists('subjects', 'id')->where('campus_id', $campusId)],
            'term_id' => ['nullable', 'integer', Rule::exists('terms', 'id')->where('campus_id', $campusId)],
            'syllabus_unit_id' => ['nullable', 'integer', Rule::exists('syllabus_units', 'id')->where('campus_id', $campusId)],
            'title' => [$presence, 'string', 'max:255'],
            'objectives' => ['nullable', 'string'],
            'content' => ['nullable', 'string'],
            'resources' => ['nullable', 'string'],
            'activities' => ['nullable', 'string'],
            'assessment' => ['nullable', 'string'],
            'planned_from' => ['nullable', 'date'],
            'planned_to' => ['nullable', 'date', 'after_or_equal:planned_from'],
            'status' => ['sometimes', Rule::in([LessonPlanStatus::Draft->value, LessonPlanStatus::Submitted->value])],
        ];
    }
}
