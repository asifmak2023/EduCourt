<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\HostelOutpassResource;
use App\Models\HostelOutpass;
use App\Services\Hostel\HostelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class HostelOutpassController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly HostelService $hostels) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $outpasses = HostelOutpass::query()
            ->with('student')
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return HostelOutpassResource::collection($outpasses);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'hostel_allocation_id' => ['nullable', 'integer', Rule::exists('hostel_allocations', 'id')],
            'student_id' => ['required', 'integer', Rule::exists('students', 'id')],
            'from_datetime' => ['required', 'date'],
            'to_datetime' => ['required', 'date', 'after:from_datetime'],
            'reason' => ['required', 'string', 'max:255'],
        ]);

        $outpass = $this->hostels->requestOutpass($data + $tenant);

        return (new HostelOutpassResource($outpass->load('student')))->response()->setStatusCode(201);
    }

    public function show(HostelOutpass $outpass): HostelOutpassResource
    {
        return new HostelOutpassResource($outpass->load('student'));
    }

    public function approve(Request $request, HostelOutpass $outpass): HostelOutpassResource
    {
        $outpass = $this->hostels->decideOutpass($outpass, 'approved', $request->user()?->id);

        return new HostelOutpassResource($outpass->load('student'));
    }

    public function reject(Request $request, HostelOutpass $outpass): HostelOutpassResource
    {
        $outpass = $this->hostels->decideOutpass($outpass, 'rejected', $request->user()?->id);

        return new HostelOutpassResource($outpass->load('student'));
    }

    public function markReturned(HostelOutpass $outpass): HostelOutpassResource
    {
        $outpass = $this->hostels->markReturned($outpass);

        return new HostelOutpassResource($outpass->load('student'));
    }

    public function destroy(HostelOutpass $outpass): JsonResponse
    {
        $outpass->delete();

        return response()->json(['message' => 'Hostel outpass removed.']);
    }
}
