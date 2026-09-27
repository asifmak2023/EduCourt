<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\HostelAllocationResource;
use App\Models\HostelAllocation;
use App\Models\HostelRoom;
use App\Services\Hostel\HostelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class HostelAllocationController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly HostelService $hostels) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $allocations = HostelAllocation::query()
            ->with(['student', 'hostel', 'room'])
            ->when($request->filled('hostel_id'), fn ($q) => $q->where('hostel_id', $request->integer('hostel_id')))
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return HostelAllocationResource::collection($allocations);
    }

    public function store(Request $request): JsonResponse
    {
        $this->academicTenantAttributes();

        $data = $request->validate([
            'hostel_room_id' => ['required', 'integer', Rule::exists('hostel_rooms', 'id')],
            'student_id' => ['required', 'integer', Rule::exists('students', 'id')],
            'bed_no' => ['nullable', 'string', 'max:32'],
            'allocated_on' => ['nullable', 'date'],
            'monthly_fee' => ['sometimes', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        $room = HostelRoom::query()->findOrFail($data['hostel_room_id']);
        $allocation = $this->hostels->allocate($room, $data);

        return (new HostelAllocationResource($allocation->load(['student', 'hostel', 'room'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(HostelAllocation $allocation): HostelAllocationResource
    {
        return new HostelAllocationResource($allocation->load(['student', 'hostel', 'room']));
    }

    public function vacate(Request $request, HostelAllocation $allocation): HostelAllocationResource
    {
        $data = $request->validate(['vacated_on' => ['nullable', 'date']]);

        $allocation = $this->hostels->vacate($allocation, $data['vacated_on'] ?? null);

        return new HostelAllocationResource($allocation->load(['student', 'hostel', 'room']));
    }

    public function destroy(HostelAllocation $allocation): JsonResponse
    {
        $allocation->delete();

        return response()->json(['message' => 'Hostel allocation removed.']);
    }
}
