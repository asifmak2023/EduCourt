<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ClassSubjectResource;
use App\Models\ClassSubject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ClassSubjectController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $mappings = ClassSubject::query()
            ->with(['subject', 'classRoom'])
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->when($request->filled('class_room_id'), fn ($q) => $q->where('class_room_id', $request->integer('class_room_id')))
            ->when($request->filled('subject_id'), fn ($q) => $q->where('subject_id', $request->integer('subject_id')))
            ->orderBy('class_room_id')
            ->orderBy('subject_id')
            ->paginate($request->integer('per_page', 25));

        return ClassSubjectResource::collection($mappings);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));
        $data += $tenant;

        $mapping = ClassSubject::create($data);

        return (new ClassSubjectResource($mapping->load(['subject', 'classRoom'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(ClassSubject $classSubject): ClassSubjectResource
    {
        return new ClassSubjectResource($classSubject->load(['subject', 'classRoom', 'academicYear']));
    }

    public function update(Request $request, ClassSubject $classSubject): ClassSubjectResource
    {
        $data = $request->validate($this->rules(
            $classSubject->campus_id,
            $classSubject->id,
            false,
            $request->integer('class_room_id') ?: $classSubject->class_room_id,
            $request->integer('academic_year_id') ?: $classSubject->academic_year_id,
        ));

        $classSubject->update($data);

        return new ClassSubjectResource($classSubject->load(['subject', 'classRoom']));
    }

    public function destroy(ClassSubject $classSubject): JsonResponse
    {
        $classSubject->delete();

        return response()->json(['message' => 'Subject mapping removed.']);
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

        return [
            'academic_year_id' => [
                $presence, 'integer',
                Rule::exists('academic_years', 'id')->where('campus_id', $campusId),
            ],
            'class_room_id' => [
                $presence, 'integer',
                Rule::exists('class_rooms', 'id')->where('campus_id', $campusId),
            ],
            'subject_id' => [
                $presence, 'integer',
                Rule::exists('subjects', 'id')->where('campus_id', $campusId),
                Rule::unique('class_subjects', 'subject_id')
                    ->where('class_room_id', $classRoomId ?? request()->integer('class_room_id'))
                    ->where('academic_year_id', $academicYearId ?? request()->integer('academic_year_id'))
                    ->ignore($ignoreId),
            ],
            'is_elective' => ['sometimes', 'boolean'],
            'weekly_periods' => ['nullable', 'integer', 'min:0', 'max:65535'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
