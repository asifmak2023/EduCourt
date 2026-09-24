<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\TimetableSlotResource;
use App\Models\ClassSubject;
use App\Models\TeachingAssignment;
use App\Models\TimetableSlot;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TimetableSlotController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $slots = TimetableSlot::query()
            ->with(['period', 'subject', 'teacher', 'classRoom', 'section', 'room'])
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->when($request->filled('term_id'), fn ($q) => $q->where('term_id', $request->integer('term_id')))
            ->when($request->filled('class_room_id'), fn ($q) => $q->where('class_room_id', $request->integer('class_room_id')))
            ->when($request->filled('section_id'), fn ($q) => $q->where('section_id', $request->integer('section_id')))
            ->when($request->filled('teacher_user_id'), fn ($q) => $q->where('teacher_user_id', $request->integer('teacher_user_id')))
            ->when($request->filled('day_of_week'), fn ($q) => $q->where('day_of_week', $request->integer('day_of_week')))
            ->orderBy('day_of_week')
            ->orderBy('period_id')
            ->paginate($request->integer('per_page', 100));

        return TimetableSlotResource::collection($slots);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));
        $data += $tenant;

        $this->assertNoConflict($data);

        $slot = TimetableSlot::create($data);

        return (new TimetableSlotResource($slot->load(['period', 'subject', 'teacher', 'classRoom', 'section', 'room'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(TimetableSlot $timetableSlot): TimetableSlotResource
    {
        return new TimetableSlotResource($timetableSlot->load([
            'period', 'subject', 'teacher', 'classRoom', 'section', 'room',
        ]));
    }

    public function update(Request $request, TimetableSlot $timetableSlot): TimetableSlotResource
    {
        $data = $request->validate($this->rules(
            $timetableSlot->campus_id,
            $timetableSlot->id,
            false,
            $timetableSlot->class_room_id,
            $timetableSlot->academic_year_id,
        ));

        $effective = $data + [
            'academic_year_id' => $data['academic_year_id'] ?? $timetableSlot->academic_year_id,
            'term_id' => $data['term_id'] ?? $timetableSlot->term_id,
            'class_room_id' => $data['class_room_id'] ?? $timetableSlot->class_room_id,
            'section_id' => $data['section_id'] ?? $timetableSlot->section_id,
            'period_id' => $data['period_id'] ?? $timetableSlot->period_id,
            'day_of_week' => $data['day_of_week'] ?? $timetableSlot->day_of_week,
            'subject_id' => $data['subject_id'] ?? $timetableSlot->subject_id,
            'teacher_user_id' => $data['teacher_user_id'] ?? $timetableSlot->teacher_user_id,
            'room_id' => $data['room_id'] ?? $timetableSlot->room_id,
        ];

        $this->assertNoConflict($effective, $timetableSlot->id);

        $timetableSlot->update($data);

        return new TimetableSlotResource($timetableSlot->load([
            'period', 'subject', 'teacher', 'classRoom', 'section', 'room',
        ]));
    }

    public function destroy(TimetableSlot $timetableSlot): JsonResponse
    {
        $timetableSlot->delete();

        return response()->json(['message' => 'Timetable slot removed.']);
    }

    public function publish(Request $request): JsonResponse
    {
        return $this->setPublished($request, true);
    }

    public function unpublish(Request $request): JsonResponse
    {
        return $this->setPublished($request, false);
    }

    private function setPublished(Request $request, bool $published): JsonResponse
    {
        $data = $request->validate([
            'academic_year_id' => ['required', 'integer'],
            'term_id' => ['nullable', 'integer'],
            'class_room_id' => ['nullable', 'integer'],
            'section_id' => ['nullable', 'integer'],
        ]);

        $count = TimetableSlot::query()
            ->where('academic_year_id', $data['academic_year_id'])
            ->when(isset($data['term_id']), fn ($q) => $q->where('term_id', $data['term_id']))
            ->when(isset($data['class_room_id']), fn ($q) => $q->where('class_room_id', $data['class_room_id']))
            ->when(isset($data['section_id']), fn ($q) => $q->where('section_id', $data['section_id']))
            ->update(['is_published' => $published]);

        return response()->json([
            'message' => $published ? 'Timetable published.' : 'Timetable unpublished.',
            'updated' => $count,
        ]);
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
        $resolvedClass = fn () => request()->integer('class_room_id') ?: $classRoomId;
        $resolvedYear = fn () => request()->integer('academic_year_id') ?: $academicYearId;

        return [
            'academic_year_id' => [
                $presence, 'integer',
                Rule::exists('academic_years', 'id')->where('campus_id', $campusId),
            ],
            'term_id' => [
                'nullable', 'integer',
                Rule::exists('terms', 'id')
                    ->where(fn ($q) => $q
                        ->where('campus_id', $campusId)
                        ->where('academic_year_id', $resolvedYear() ?? 0)),
            ],
            'class_room_id' => [
                $presence, 'integer',
                Rule::exists('class_rooms', 'id')->where('campus_id', $campusId),
            ],
            'section_id' => [
                'nullable', 'integer',
                Rule::exists('sections', 'id')
                    ->where(fn ($q) => $q
                        ->where('campus_id', $campusId)
                        ->where('class_room_id', $resolvedClass() ?? 0)),
            ],
            'period_id' => [
                $presence, 'integer',
                Rule::exists('periods', 'id')->where('campus_id', $campusId),
            ],
            'day_of_week' => [$presence, 'integer', 'between:1,7'],
            'subject_id' => [
                'nullable', 'integer',
                Rule::exists('subjects', 'id')->where('campus_id', $campusId),
            ],
            'teacher_user_id' => [
                'nullable', 'integer',
                Rule::exists('users', 'id')->where('campus_id', $campusId),
            ],
            'room_id' => [
                'nullable', 'integer',
                Rule::exists('rooms', 'id')->where('campus_id', $campusId),
            ],
            'is_published' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function assertNoConflict(array $data, ?int $ignoreId = null): void
    {
        $yearId = (int) $data['academic_year_id'];
        $termId = $data['term_id'] ?? null;
        $day = (int) $data['day_of_week'];
        $periodId = (int) $data['period_id'];
        $sectionId = $data['section_id'] ?? null;

        $base = fn (): Builder => TimetableSlot::query()
            ->where('academic_year_id', $yearId)
            ->where('day_of_week', $day)
            ->where('period_id', $periodId)
            ->when($termId !== null, fn (Builder $q) => $q->where('term_id', $termId))
            ->when($termId === null, fn (Builder $q) => $q->whereNull('term_id'))
            ->when($ignoreId !== null, fn (Builder $q) => $q->whereKeyNot($ignoreId));

        $classClash = $base()
            ->where('class_room_id', (int) $data['class_room_id'])
            ->when($sectionId !== null, fn (Builder $q) => $q->where('section_id', $sectionId))
            ->when($sectionId === null, fn (Builder $q) => $q->whereNull('section_id'))
            ->exists();

        if ($classClash) {
            abort(409, 'This class already has a slot at that day and period.');
        }

        if (! empty($data['teacher_user_id']) && $base()->where('teacher_user_id', (int) $data['teacher_user_id'])->exists()) {
            abort(409, 'The teacher is already booked at that day and period.');
        }

        if (! empty($data['room_id']) && $base()->where('room_id', (int) $data['room_id'])->exists()) {
            abort(409, 'The room is already booked at that day and period.');
        }

        if (! empty($data['subject_id'])) {
            $mapped = ClassSubject::query()
                ->where('academic_year_id', $yearId)
                ->where('class_room_id', (int) $data['class_room_id'])
                ->where('subject_id', (int) $data['subject_id'])
                ->exists();

            if (! $mapped) {
                throw ValidationException::withMessages([
                    'subject_id' => ['The subject is not mapped to this class for the academic year.'],
                ]);
            }

            if (! empty($data['teacher_user_id']) && ! $this->teacherAssigned($data)) {
                throw ValidationException::withMessages([
                    'teacher_user_id' => ['The teacher is not assigned to this subject, class and section.'],
                ]);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function teacherAssigned(array $data): bool
    {
        return TeachingAssignment::query()
            ->where('academic_year_id', (int) $data['academic_year_id'])
            ->where('teacher_user_id', (int) $data['teacher_user_id'])
            ->where('subject_id', (int) $data['subject_id'])
            ->where('class_room_id', (int) $data['class_room_id'])
            ->when(! empty($data['section_id']), fn (Builder $q) => $q->where('section_id', $data['section_id']))
            ->exists();
    }
}
