<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\TransportAllocationResource;
use App\Models\TransportAllocation;
use App\Models\TransportRoute;
use App\Services\Transport\TransportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class TransportAllocationController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly TransportService $transport) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $allocations = TransportAllocation::query()
            ->with(['student', 'route', 'stop', 'vehicle'])
            ->when($request->filled('transport_route_id'), fn ($q) => $q->where('transport_route_id', $request->integer('transport_route_id')))
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return TransportAllocationResource::collection($allocations);
    }

    public function store(Request $request): JsonResponse
    {
        $this->academicTenantAttributes();

        $data = $request->validate([
            'student_id' => ['required', 'integer', Rule::exists('students', 'id')],
            'transport_route_id' => ['required', 'integer', Rule::exists('transport_routes', 'id')],
            'transport_route_stop_id' => ['nullable', 'integer', Rule::exists('transport_route_stops', 'id')],
            'vehicle_id' => ['nullable', 'integer', Rule::exists('vehicles', 'id')],
            'direction' => ['sometimes', Rule::in(['pickup', 'drop', 'both'])],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'fare' => ['sometimes', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        $data['start_date'] = $data['start_date'] ?? now()->toDateString();

        $route = TransportRoute::query()->findOrFail($data['transport_route_id']);
        $allocation = $this->transport->allocate($route, $data);

        return (new TransportAllocationResource($allocation->load(['student', 'route', 'stop', 'vehicle'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(TransportAllocation $allocation): TransportAllocationResource
    {
        return new TransportAllocationResource($allocation->load(['student', 'route', 'stop', 'vehicle']));
    }

    public function deallocate(Request $request, TransportAllocation $allocation): TransportAllocationResource
    {
        $data = $request->validate(['end_date' => ['nullable', 'date']]);

        $allocation = $this->transport->deallocate($allocation, $data['end_date'] ?? null);

        return new TransportAllocationResource($allocation->load(['student', 'route', 'stop', 'vehicle']));
    }

    public function destroy(TransportAllocation $allocation): JsonResponse
    {
        $allocation->delete();

        return response()->json(['message' => 'Transport allocation removed.']);
    }
}
