<?php

namespace App\Http\Controllers\Api;

use App\Enums\AttendanceStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\StaffAttendanceResource;
use App\Models\StaffAttendance;
use App\Services\Attendance\AttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class StaffAttendanceController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly AttendanceService $attendance) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $records = StaffAttendance::query()
            ->with('user')
            ->when($request->filled('attendance_date'), fn ($q) => $q->whereDate('attendance_date', $request->date('attendance_date')))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('attendance_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('attendance_date', '<=', $request->date('to')))
            ->when($request->filled('user_id'), fn ($q) => $q->where('user_id', $request->integer('user_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->orderByDesc('attendance_date')
            ->orderBy('user_id')
            ->paginate($request->integer('per_page', 50));

        return StaffAttendanceResource::collection($records);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->recordRules($tenant['campus_id'], true));

        $records = $this->attendance->markStaff($tenant, $request->user(), $data['attendance_date'], [[
            'user_id' => $data['user_id'],
            'status' => $data['status'],
            'check_in' => $data['check_in'] ?? null,
            'check_out' => $data['check_out'] ?? null,
            'remarks' => $data['remarks'] ?? null,
        ]]);

        return (new StaffAttendanceResource($records->first()->load('user')))
            ->response()->setStatusCode(201);
    }

    public function bulkStore(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'attendance_date' => ['required', 'date'],
            'records' => ['required', 'array', 'min:1'],
            'records.*.user_id' => [
                'required', 'integer', 'distinct',
                Rule::exists('users', 'id')->where('campus_id', $tenant['campus_id']),
            ],
            'records.*.status' => ['required', Rule::enum(AttendanceStatus::class)],
            'records.*.check_in' => ['nullable', 'date_format:H:i'],
            'records.*.check_out' => ['nullable', 'date_format:H:i'],
            'records.*.remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        $records = $this->attendance->markStaff($tenant, $request->user(), $data['attendance_date'], $data['records']);

        return StaffAttendanceResource::collection($records->load('user'))
            ->response()->setStatusCode(201);
    }

    public function update(Request $request, StaffAttendance $staffAttendance): StaffAttendanceResource
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::enum(AttendanceStatus::class)],
            'check_in' => ['nullable', 'date_format:H:i'],
            'check_out' => ['nullable', 'date_format:H:i'],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        $staffAttendance->update($data);

        return new StaffAttendanceResource($staffAttendance->refresh()->load('user'));
    }

    public function destroy(StaffAttendance $staffAttendance): JsonResponse
    {
        $staffAttendance->delete();

        return response()->json(['message' => 'Staff attendance record removed.']);
    }

    public function report(Request $request): JsonResponse
    {
        $this->academicTenantAttributes();

        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'user_id' => ['nullable', 'integer'],
        ]);

        $from = isset($data['from']) ? $data['from'] : now()->startOfMonth()->toDateString();
        $to = isset($data['to']) ? $data['to'] : now()->toDateString();

        $query = StaffAttendance::query()
            ->whereBetween('attendance_date', [$from, $to])
            ->when($data['user_id'] ?? null, fn ($q, $userId) => $q->where('user_id', $userId));

        $byStatus = (clone $query)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $perStaff = (clone $query)
            ->with('user')
            ->get()
            ->groupBy('user_id')
            ->map(function ($rows) {
                return [
                    'user_id' => $rows->first()->user_id,
                    'user' => $rows->first()->user?->name,
                    'present' => $rows->where('status', AttendanceStatus::Present)->count(),
                    'late' => $rows->where('status', AttendanceStatus::Late)->count(),
                    'leave' => $rows->where('status', AttendanceStatus::Leave)->count(),
                    'absent' => $rows->where('status', AttendanceStatus::Absent)->count(),
                    'days' => $rows->count(),
                ];
            })
            ->values()
            ->all();

        return response()->json([
            'data' => [
                'from' => $from,
                'to' => $to,
                'by_status' => $byStatus,
                'by_staff' => $perStaff,
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function recordRules(int $campusId, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'user_id' => [
                $presence, 'integer',
                Rule::exists('users', 'id')->where('campus_id', $campusId),
            ],
            'attendance_date' => [$presence, 'date'],
            'status' => [$presence, Rule::enum(AttendanceStatus::class)],
            'check_in' => ['nullable', 'date_format:H:i'],
            'check_out' => ['nullable', 'date_format:H:i'],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
