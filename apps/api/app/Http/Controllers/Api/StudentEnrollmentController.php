<?php

namespace App\Http\Controllers\Api;

use App\Enums\EnrollmentStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\StudentEnrollmentResource;
use App\Models\Section;
use App\Models\StudentEnrollment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class StudentEnrollmentController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $enrollments = StudentEnrollment::query()
            ->with(['student', 'academicYear', 'classRoom', 'section'])
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->when($request->filled('class_room_id'), fn ($q) => $q->where('class_room_id', $request->integer('class_room_id')))
            ->when($request->filled('section_id'), fn ($q) => $q->where('section_id', $request->integer('section_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return StudentEnrollmentResource::collection($enrollments);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));
        $this->assertSectionMatchesClass($data['section_id'] ?? null, $data['class_room_id']);
        $this->assertUniqueEnrollment($data['student_id'], $data['academic_year_id']);

        $enrollment = StudentEnrollment::create([
            ...$data,
            ...$tenant,
            'status' => $data['status'] ?? EnrollmentStatus::Active->value,
        ]);

        return (new StudentEnrollmentResource($enrollment->load(['student', 'academicYear', 'classRoom', 'section'])))
            ->response()->setStatusCode(201);
    }

    public function show(StudentEnrollment $studentEnrollment): StudentEnrollmentResource
    {
        return new StudentEnrollmentResource($studentEnrollment->load(['student', 'academicYear', 'classRoom', 'section']));
    }

    public function update(Request $request, StudentEnrollment $studentEnrollment): StudentEnrollmentResource
    {
        $data = $request->validate($this->rules($studentEnrollment->campus_id, $studentEnrollment->id, false));

        $classRoomId = $data['class_room_id'] ?? $studentEnrollment->class_room_id;
        $sectionId = array_key_exists('section_id', $data) ? $data['section_id'] : $studentEnrollment->section_id;
        $this->assertSectionMatchesClass($sectionId, $classRoomId);
        $this->assertUniqueEnrollment(
            $data['student_id'] ?? $studentEnrollment->student_id,
            $data['academic_year_id'] ?? $studentEnrollment->academic_year_id,
            $studentEnrollment->id,
        );

        $studentEnrollment->update($data);

        return new StudentEnrollmentResource($studentEnrollment->refresh()->load(['student', 'academicYear', 'classRoom', 'section']));
    }

    public function destroy(StudentEnrollment $studentEnrollment): JsonResponse
    {
        $studentEnrollment->delete();

        return response()->json(['message' => 'Enrollment removed.']);
    }

    private function assertSectionMatchesClass(?int $sectionId, int $classRoomId): void
    {
        if ($sectionId === null) {
            return;
        }

        $belongs = Section::query()->whereKey($sectionId)->where('class_room_id', $classRoomId)->exists();

        if (! $belongs) {
            abort(422, 'The selected section does not belong to the selected class.');
        }
    }

    private function assertUniqueEnrollment(int $studentId, int $academicYearId, ?int $ignoreId = null): void
    {
        $exists = StudentEnrollment::query()
            ->where('student_id', $studentId)
            ->where('academic_year_id', $academicYearId)
            ->when($ignoreId !== null, fn ($q) => $q->whereKeyNot($ignoreId))
            ->exists();

        if ($exists) {
            abort(422, 'The student is already enrolled for this academic year.');
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, ?int $ignoreId = null, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'student_id' => [
                $presence, 'integer',
                Rule::exists('students', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'academic_year_id' => [
                $presence, 'integer',
                Rule::exists('academic_years', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'class_room_id' => [
                $presence, 'integer',
                Rule::exists('class_rooms', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'section_id' => ['nullable', 'integer', 'exists:sections,id'],
            'roll_number' => ['nullable', 'string', 'max:32'],
            'status' => ['sometimes', Rule::in(array_map(fn ($case) => $case->value, EnrollmentStatus::cases()))],
            'starts_on' => ['nullable', 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
