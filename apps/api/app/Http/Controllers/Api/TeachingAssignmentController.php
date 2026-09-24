<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\TeachingAssignmentResource;
use App\Models\ClassSubject;
use App\Models\TeachingAssignment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TeachingAssignmentController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $assignments = TeachingAssignment::query()
            ->with(['teacher', 'subject', 'classRoom', 'section'])
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->when($request->filled('teacher_user_id'), fn ($q) => $q->where('teacher_user_id', $request->integer('teacher_user_id')))
            ->when($request->filled('class_room_id'), fn ($q) => $q->where('class_room_id', $request->integer('class_room_id')))
            ->when($request->filled('section_id'), fn ($q) => $q->where('section_id', $request->integer('section_id')))
            ->when($request->filled('subject_id'), fn ($q) => $q->where('subject_id', $request->integer('subject_id')))
            ->orderBy('class_room_id')
            ->orderBy('section_id')
            ->paginate($request->integer('per_page', 25));

        return TeachingAssignmentResource::collection($assignments);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));
        $data += $tenant;

        $this->assertAssignable($data);

        $assignment = TeachingAssignment::create($data);

        return (new TeachingAssignmentResource($assignment->load(['teacher', 'subject', 'classRoom', 'section'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(TeachingAssignment $teachingAssignment): TeachingAssignmentResource
    {
        return new TeachingAssignmentResource($teachingAssignment->load([
            'teacher', 'subject', 'classRoom', 'section', 'academicYear',
        ]));
    }

    public function update(Request $request, TeachingAssignment $teachingAssignment): TeachingAssignmentResource
    {
        $data = $request->validate($this->rules(
            $teachingAssignment->campus_id,
            $teachingAssignment->id,
            false,
            $teachingAssignment->class_room_id,
            $teachingAssignment->academic_year_id,
        ));

        $this->assertAssignable($data + [
            'academic_year_id' => $data['academic_year_id'] ?? $teachingAssignment->academic_year_id,
            'subject_id' => $data['subject_id'] ?? $teachingAssignment->subject_id,
            'class_room_id' => $data['class_room_id'] ?? $teachingAssignment->class_room_id,
            'section_id' => $data['section_id'] ?? $teachingAssignment->section_id,
            'teacher_user_id' => $data['teacher_user_id'] ?? $teachingAssignment->teacher_user_id,
        ], $teachingAssignment->id);

        $teachingAssignment->update($data);

        return new TeachingAssignmentResource($teachingAssignment->load(['teacher', 'subject', 'classRoom', 'section']));
    }

    public function destroy(TeachingAssignment $teachingAssignment): JsonResponse
    {
        $teachingAssignment->delete();

        return response()->json(['message' => 'Teaching assignment removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(
        int $campusId,
        ?int $ignoreId = null,
        bool $required = true,
        ?int $classRoomId = null,
        ?int $academicYearId = null,
    ): array {
        $presence = $required ? 'required' : 'sometimes';
        $sectionClassRoom = fn () => request()->integer('class_room_id') ?: $classRoomId;

        return [
            'academic_year_id' => [
                $presence, 'integer',
                Rule::exists('academic_years', 'id')->where('campus_id', $campusId),
            ],
            'teacher_user_id' => [
                $presence, 'integer',
                Rule::exists('users', 'id')->where('campus_id', $campusId),
            ],
            'subject_id' => [
                $presence, 'integer',
                Rule::exists('subjects', 'id')->where('campus_id', $campusId),
            ],
            'class_room_id' => [
                $presence, 'integer',
                Rule::exists('class_rooms', 'id')->where('campus_id', $campusId),
            ],
            'section_id' => [
                'nullable', 'integer',
                Rule::exists('sections', 'id')
                    ->where(fn ($query) => $query
                        ->where('campus_id', $campusId)
                        ->where('class_room_id', $sectionClassRoom() ?? 0)),
            ],
            'weekly_periods' => ['nullable', 'integer', 'min:0', 'max:65535'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function assertAssignable(array $data, ?int $ignoreId = null): void
    {
        $yearId = (int) $data['academic_year_id'];
        $subjectId = (int) $data['subject_id'];
        $classRoomId = (int) $data['class_room_id'];
        $sectionId = $data['section_id'] ?? null;
        $teacherId = (int) $data['teacher_user_id'];

        $mapped = ClassSubject::query()
            ->where('academic_year_id', $yearId)
            ->where('class_room_id', $classRoomId)
            ->where('subject_id', $subjectId)
            ->exists();

        if (! $mapped) {
            throw ValidationException::withMessages([
                'subject_id' => ['The subject is not mapped to this class for the academic year.'],
            ]);
        }

        $slot = TeachingAssignment::query()
            ->where('academic_year_id', $yearId)
            ->where('class_room_id', $classRoomId)
            ->where('subject_id', $subjectId)
            ->where('is_active', true)
            ->when($sectionId !== null, fn (Builder $q) => $q->where('section_id', $sectionId))
            ->when($sectionId === null, fn (Builder $q) => $q->whereNull('section_id'))
            ->when($ignoreId !== null, fn (Builder $q) => $q->whereKeyNot($ignoreId));

        if ($slot->exists()) {
            abort(409, 'This subject slot already has an active teacher for the academic year.');
        }

        $limit = (int) config('academic.max_teacher_weekly_periods');
        $assigned = (int) TeachingAssignment::query()
            ->where('academic_year_id', $yearId)
            ->where('teacher_user_id', $teacherId)
            ->where('is_active', true)
            ->when($ignoreId !== null, fn (Builder $q) => $q->whereKeyNot($ignoreId))
            ->sum('weekly_periods');

        $requested = (int) ($data['weekly_periods'] ?? 0);

        if ($limit > 0 && ($assigned + $requested) > $limit) {
            abort(409, "Teacher workload exceeds the weekly limit of {$limit} periods.");
        }
    }
}
