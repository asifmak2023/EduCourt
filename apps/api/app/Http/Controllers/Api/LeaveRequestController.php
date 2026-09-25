<?php

namespace App\Http\Controllers\Api;

use App\Enums\LeaveStatus;
use App\Enums\LeaveType;
use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\LeaveRequestResource;
use App\Models\LeaveRequest;
use App\Services\Attendance\AttendanceService;
use App\Services\Attendance\LeaveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class LeaveRequestController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(
        private readonly LeaveService $leaves,
        private readonly AttendanceService $attendance,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $requests = LeaveRequest::query()
            ->with(['user', 'decidedBy'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->when($request->filled('user_id'), fn ($q) => $q->where('user_id', $request->integer('user_id')))
            ->when($request->filled('leave_type'), fn ($q) => $q->where('leave_type', $request->string('leave_type')->toString()))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('to_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('from_date', '<=', $request->date('to')))
            ->orderByDesc('from_date')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return LeaveRequestResource::collection($requests);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $canManage = $request->user()->can('attendance.approve');

        $data = $request->validate([
            'user_id' => [
                'nullable', 'integer',
                Rule::exists('users', 'id')->where('campus_id', $tenant['campus_id']),
            ],
            'leave_type' => ['required', Rule::enum(LeaveType::class)],
            'from_date' => ['required', 'date'],
            'to_date' => ['required', 'date', 'after_or_equal:from_date'],
            'days' => ['nullable', 'numeric', 'min:0.5', 'max:366'],
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $userId = $canManage ? ($data['user_id'] ?? $request->user()->id) : $request->user()->id;

        $leave = LeaveRequest::create($tenant + [
            'user_id' => $userId,
            'leave_type' => $data['leave_type'],
            'from_date' => $data['from_date'],
            'to_date' => $data['to_date'],
            'days' => $data['days'] ?? $this->attendance->inclusiveDays($data['from_date'], $data['to_date']),
            'reason' => $data['reason'] ?? null,
            'status' => LeaveStatus::Pending,
        ]);

        return (new LeaveRequestResource($leave->load('user')))->response()->setStatusCode(201);
    }

    public function show(LeaveRequest $leaveRequest): LeaveRequestResource
    {
        return new LeaveRequestResource($leaveRequest->load(['user', 'decidedBy']));
    }

    public function update(Request $request, LeaveRequest $leaveRequest): LeaveRequestResource
    {
        if ($leaveRequest->status !== LeaveStatus::Pending) {
            throw ValidationException::withMessages([
                'status' => ['Only pending leave requests can be edited.'],
            ]);
        }

        $data = $request->validate([
            'leave_type' => ['sometimes', Rule::enum(LeaveType::class)],
            'from_date' => ['sometimes', 'date'],
            'to_date' => ['sometimes', 'date'],
            'days' => ['nullable', 'numeric', 'min:0.5', 'max:366'],
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $from = $data['from_date'] ?? $leaveRequest->from_date->toDateString();
        $to = $data['to_date'] ?? $leaveRequest->to_date->toDateString();

        if ($to < $from) {
            throw ValidationException::withMessages([
                'to_date' => ['The end date must be on or after the start date.'],
            ]);
        }

        $leaveRequest->update($data + [
            'days' => $data['days'] ?? $this->attendance->inclusiveDays($from, $to),
        ]);

        return new LeaveRequestResource($leaveRequest->refresh()->load(['user', 'decidedBy']));
    }

    public function approve(Request $request, LeaveRequest $leaveRequest): LeaveRequestResource
    {
        $data = $request->validate(['decision_note' => ['nullable', 'string', 'max:2000']]);

        $leave = $this->leaves->approve($leaveRequest, $request->user(), $data['decision_note'] ?? null);

        return new LeaveRequestResource($leave->load(['user', 'decidedBy']));
    }

    public function reject(Request $request, LeaveRequest $leaveRequest): LeaveRequestResource
    {
        $data = $request->validate(['decision_note' => ['nullable', 'string', 'max:2000']]);

        $leave = $this->leaves->reject($leaveRequest, $request->user(), $data['decision_note'] ?? null);

        return new LeaveRequestResource($leave->load(['user', 'decidedBy']));
    }

    public function cancel(Request $request, LeaveRequest $leaveRequest): LeaveRequestResource
    {
        if ($leaveRequest->status !== LeaveStatus::Pending) {
            throw ValidationException::withMessages([
                'status' => ['Only pending leave requests can be cancelled.'],
            ]);
        }

        if ($leaveRequest->user_id !== $request->user()->id && ! $request->user()->can('attendance.approve')) {
            abort(403, 'You can only cancel your own leave requests.');
        }

        $leaveRequest->forceFill(['status' => LeaveStatus::Cancelled])->save();

        return new LeaveRequestResource($leaveRequest->refresh()->load(['user', 'decidedBy']));
    }

    public function destroy(LeaveRequest $leaveRequest): JsonResponse
    {
        $leaveRequest->delete();

        return response()->json(['message' => 'Leave request archived.']);
    }
}
