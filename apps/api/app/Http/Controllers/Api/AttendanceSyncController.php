<?php

namespace App\Http\Controllers\Api;

use App\Enums\AttendanceStatus;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\AttendanceSyncBatchResource;
use App\Models\AttendanceSyncBatch;
use App\Services\Attendance\AttendanceSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class AttendanceSyncController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly AttendanceSyncService $sync) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $batches = AttendanceSyncBatch::query()
            ->when($request->filled('device_id'), fn ($q) => $q->where('device_id', $request->string('device_id')))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return AttendanceSyncBatchResource::collection($batches);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'device_id' => ['nullable', 'string', 'max:100'],
            'client_batch_uuid' => ['nullable', 'uuid'],
            'records' => ['required', 'array', 'min:1', 'max:500'],
            'records.*.client_uuid' => ['required', 'uuid', 'distinct'],
            'records.*.student_id' => [
                'required', 'integer',
                Rule::exists('students', 'id')->where('campus_id', $tenant['campus_id'])->whereNull('deleted_at'),
            ],
            'records.*.attendance_date' => ['required', 'date'],
            'records.*.status' => ['required', Rule::enum(AttendanceStatus::class)],
            'records.*.remarks' => ['nullable', 'string', 'max:1000'],
            'records.*.captured_at' => ['required', 'date'],
            'records.*.academic_year_id' => ['nullable', 'integer'],
            'records.*.class_room_id' => ['nullable', 'integer'],
            'records.*.section_id' => ['nullable', 'integer'],
        ]);

        $batch = $this->sync->sync(
            $tenant,
            $request->user(),
            $data['device_id'] ?? null,
            $data['records'],
            $data['client_batch_uuid'] ?? null,
        );

        return (new AttendanceSyncBatchResource($batch))
            ->response()
            ->setStatusCode(201);
    }
}
