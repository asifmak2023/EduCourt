<?php

namespace App\Http\Controllers\Api;

use App\Enums\ConductCategory;
use App\Enums\ConductSeverity;
use App\Enums\ConductStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ConductRecordResource;
use App\Models\ConductRecord;
use App\Models\Student;
use App\Services\Access\TeacherScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ConductRecordController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly TeacherScope $teacherScope) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $records = ConductRecord::query()
            ->with(['student', 'academicYear', 'reportedBy', 'resolvedBy'])
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->integer('academic_year_id')))
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->string('category')->toString()))
            ->when($request->filled('severity'), fn ($q) => $q->where('severity', $request->string('severity')->toString()))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('occurred_on', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('occurred_on', '<=', $request->date('to')))
            ->orderByDesc('occurred_on')
            ->orderByDesc('id');

        $this->teacherScope->applyTo($records, $request->user(), 'student_id');

        $records = $records->paginate($request->integer('per_page', 25));

        return ConductRecordResource::collection($records);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        abort_unless($this->teacherScope->allowsStudent($request->user(), (int) $data['student_id']), 403, 'This student is outside your assigned classes.');

        $record = ConductRecord::create($data + $tenant + [
            'status' => $data['status'] ?? ConductStatus::Open,
            'reported_by' => $request->user()?->id,
            'created_by' => $request->user()?->id,
        ]);

        return (new ConductRecordResource($record->load(['student', 'academicYear'])))
            ->response()->setStatusCode(201);
    }

    public function show(Request $request, ConductRecord $conductRecord): ConductRecordResource
    {
        abort_unless($this->teacherScope->allowsStudent($request->user(), $conductRecord->student_id), 403, 'This record is outside your assigned classes.');

        return new ConductRecordResource(
            $conductRecord->load(['student', 'academicYear', 'reportedBy', 'resolvedBy'])
        );
    }

    public function update(Request $request, ConductRecord $conductRecord): ConductRecordResource
    {
        abort_unless($this->teacherScope->allowsStudent($request->user(), $conductRecord->student_id), 403, 'This record is outside your assigned classes.');

        $data = $request->validate($this->rules($conductRecord->campus_id, true));

        $conductRecord->update($data);

        return new ConductRecordResource(
            $conductRecord->refresh()->load(['student', 'academicYear', 'reportedBy', 'resolvedBy'])
        );
    }

    public function resolve(Request $request, ConductRecord $conductRecord): ConductRecordResource
    {
        abort_unless($this->teacherScope->allowsStudent($request->user(), $conductRecord->student_id), 403, 'This record is outside your assigned classes.');

        $data = $request->validate([
            'status' => ['required', Rule::in([ConductStatus::Resolved->value, ConductStatus::Dismissed->value])],
            'resolution_note' => ['nullable', 'string', 'max:2000'],
            'action_taken' => ['nullable', 'string', 'max:2000'],
        ]);

        $conductRecord->update([
            'status' => $data['status'],
            'resolution_note' => $data['resolution_note'] ?? null,
            'action_taken' => $data['action_taken'] ?? $conductRecord->action_taken,
            'resolved_by' => $request->user()?->id,
            'resolved_at' => now(),
        ]);

        return new ConductRecordResource(
            $conductRecord->refresh()->load(['student', 'academicYear', 'reportedBy', 'resolvedBy'])
        );
    }

    public function destroy(ConductRecord $conductRecord): JsonResponse
    {
        $conductRecord->delete();

        return response()->json(['message' => 'Conduct record archived.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, bool $sometimes = false): array
    {
        $presence = $sometimes ? 'sometimes' : 'required';

        return [
            'student_id' => [
                $presence, 'integer',
                Rule::exists('students', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'academic_year_id' => ['nullable', 'integer', Rule::exists('academic_years', 'id')->where('campus_id', $campusId)],
            'category' => ['sometimes', Rule::enum(ConductCategory::class)],
            'severity' => ['sometimes', Rule::enum(ConductSeverity::class)],
            'title' => [$presence, 'string', 'max:191'],
            'description' => ['nullable', 'string', 'max:5000'],
            'action_taken' => ['nullable', 'string', 'max:5000'],
            'occurred_on' => [$presence, 'date'],
            'status' => ['sometimes', Rule::enum(ConductStatus::class)],
        ];
    }
}
