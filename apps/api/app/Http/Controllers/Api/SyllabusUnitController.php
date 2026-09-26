<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\SyllabusUnitResource;
use App\Models\SyllabusUnit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class SyllabusUnitController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $units = SyllabusUnit::query()
            ->with(['subject', 'classRoom', 'term'])
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->when($request->filled('class_room_id'), fn ($q) => $q->where('class_room_id', $request->integer('class_room_id')))
            ->when($request->filled('subject_id'), fn ($q) => $q->where('subject_id', $request->integer('subject_id')))
            ->when($request->filled('term_id'), fn ($q) => $q->where('term_id', $request->integer('term_id')))
            ->orderBy('class_room_id')
            ->orderBy('subject_id')
            ->orderBy('sequence')
            ->paginate($request->integer('per_page', 50));

        return SyllabusUnitResource::collection($units);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));
        $data += $tenant;

        $unit = SyllabusUnit::create($data);

        return (new SyllabusUnitResource($unit->load(['subject', 'classRoom', 'term'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(SyllabusUnit $syllabusUnit): SyllabusUnitResource
    {
        return new SyllabusUnitResource($syllabusUnit->load(['subject', 'classRoom', 'term']));
    }

    public function update(Request $request, SyllabusUnit $syllabusUnit): SyllabusUnitResource
    {
        $data = $request->validate($this->rules($syllabusUnit->campus_id, false));

        $syllabusUnit->update($data);

        return new SyllabusUnitResource($syllabusUnit->load(['subject', 'classRoom', 'term']));
    }

    public function destroy(SyllabusUnit $syllabusUnit): JsonResponse
    {
        $syllabusUnit->delete();

        return response()->json(['message' => 'Syllabus unit removed.']);
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
            'title' => [$presence, 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'sequence' => ['sometimes', 'integer', 'min:1', 'max:65535'],
            'estimated_periods' => ['nullable', 'integer', 'min:0', 'max:65535'],
        ];
    }
}
