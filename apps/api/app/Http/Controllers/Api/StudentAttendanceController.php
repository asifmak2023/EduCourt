<?php

namespace App\Http\Controllers\Api;

use App\Enums\AttendanceStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\StudentAttendanceResource;
use App\Models\Student;
use App\Models\StudentAttendance;
use App\Services\Access\TeacherScope;
use App\Services\Attendance\AttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class StudentAttendanceController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(
        private readonly AttendanceService $attendance,
        private readonly TeacherScope $teacherScope,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $records = StudentAttendance::query()
            ->with(['student', 'classRoom', 'section'])
            ->when($request->filled('attendance_date'), fn ($q) => $q->whereDate('attendance_date', $request->date('attendance_date')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('attendance_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('attendance_date', '<=', $request->date('to')))
            ->when($request->filled('class_room_id'), fn ($q) => $q->where('class_room_id', $request->integer('class_room_id')))
            ->when($request->filled('section_id'), fn ($q) => $q->where('section_id', $request->integer('section_id')))
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()));

        $this->teacherScope->applyTo($records, $request->user(), 'student_id');

        $records = $records
            ->orderByDesc('attendance_date')
            ->orderBy('student_id')
            ->paginate($request->integer('per_page', 50));

        return StudentAttendanceResource::collection($records);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->recordRules($tenant['campus_id'], true));

        $this->guardStudents($request, [$data['student_id']]);

        $records = $this->attendance->markStudents(
            $tenant,
            $request->user(),
            $data['attendance_date'],
            [['student_id' => $data['student_id'], 'status' => $data['status'], 'remarks' => $data['remarks'] ?? null]],
            $this->context($data)
        );

        return (new StudentAttendanceResource($records->first()->load('student')))
            ->response()->setStatusCode(201);
    }

    public function bulkStore(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'attendance_date' => ['required', 'date'],
            'academic_year_id' => [
                'nullable', 'integer',
                Rule::exists('academic_years', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'class_room_id' => [
                'nullable', 'integer',
                Rule::exists('class_rooms', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'section_id' => ['nullable', 'integer'],
            'records' => ['required', 'array', 'min:1'],
            'records.*.student_id' => ['required', 'integer', 'distinct'],
            'records.*.status' => ['required', Rule::enum(AttendanceStatus::class)],
            'records.*.remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        $this->guardStudents($request, collect($data['records'])->pluck('student_id')->all());

        $records = $this->attendance->markStudents(
            $tenant,
            $request->user(),
            $data['attendance_date'],
            $data['records'],
            $this->context($data)
        );

        return StudentAttendanceResource::collection($records->load('student'))
            ->response()->setStatusCode(201);
    }

    public function update(Request $request, StudentAttendance $studentAttendance): StudentAttendanceResource
    {
        abort_unless($this->teacherScope->allowsStudent($request->user(), $studentAttendance->student_id), 403, 'This record is outside your assigned classes.');

        $data = $request->validate([
            'status' => ['sometimes', Rule::enum(AttendanceStatus::class)],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        $studentAttendance->update($data);

        return new StudentAttendanceResource($studentAttendance->refresh()->load('student'));
    }

    public function destroy(Request $request, StudentAttendance $studentAttendance): JsonResponse
    {
        abort_unless($this->teacherScope->allowsStudent($request->user(), $studentAttendance->student_id), 403, 'This record is outside your assigned classes.');

        $studentAttendance->delete();

        return response()->json(['message' => 'Attendance record removed.']);
    }

    public function report(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'class_room_id' => ['nullable', 'integer'],
            'section_id' => ['nullable', 'integer'],
        ]);

        $from = isset($data['from']) ? $data['from'] : now()->startOfMonth()->toDateString();
        $to = isset($data['to']) ? $data['to'] : now()->toDateString();
        $scopeStudentIds = $this->teacherScope->isTeacherScoped($request->user())
            ? $this->teacherScope->studentIds($request->user())
            : null;

        return response()->json([
            'data' => $this->attendance->classSummary(
                $tenant['campus_id'],
                $from,
                $to,
                $data['class_room_id'] ?? null,
                $data['section_id'] ?? null,
                $scopeStudentIds,
            ),
        ]);
    }

    public function studentReport(Request $request, Student $student): JsonResponse
    {
        abort_unless($this->teacherScope->allowsStudent($request->user(), $student->id), 403, 'This student is outside your assigned classes.');

        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $from = isset($data['from']) ? $data['from'] : now()->startOfMonth()->toDateString();
        $to = isset($data['to']) ? $data['to'] : now()->toDateString();

        return response()->json([
            'data' => $this->attendance->studentSummary($student->id, $from, $to),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function recordRules(int $campusId, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'student_id' => [
                $presence, 'integer',
                Rule::exists('students', 'id')->where('campus_id', $campusId)->whereNull('deleted_at'),
            ],
            'attendance_date' => [$presence, 'date'],
            'status' => [$presence, Rule::enum(AttendanceStatus::class)],
            'remarks' => ['nullable', 'string', 'max:1000'],
            'academic_year_id' => ['nullable', 'integer'],
            'class_room_id' => ['nullable', 'integer'],
            'section_id' => ['nullable', 'integer'],
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{academic_year_id?: int|null, class_room_id?: int|null, section_id?: int|null}
     */
    private function context(array $data): array
    {
        return [
            'academic_year_id' => $data['academic_year_id'] ?? null,
            'class_room_id' => $data['class_room_id'] ?? null,
            'section_id' => $data['section_id'] ?? null,
        ];
    }

    /**
     * @param  array<int, int|string>  $studentIds
     */
    private function guardStudents(Request $request, array $studentIds): void
    {
        $user = $request->user();

        if (! $this->teacherScope->isTeacherScoped($user)) {
            return;
        }

        $allowed = $this->teacherScope->studentIds($user);

        foreach ($studentIds as $studentId) {
            abort_if(! in_array((int) $studentId, $allowed, true), 403, 'One or more students are outside your assigned classes.');
        }
    }
}
