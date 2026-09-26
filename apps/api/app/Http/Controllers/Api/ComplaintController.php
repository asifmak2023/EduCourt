<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ComplaintResource;
use App\Models\Complaint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ComplaintController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $complaints = Complaint::query()
            ->with('student')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('priority'), fn ($q) => $q->where('priority', $request->string('priority')))
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->string('category')))
            ->when($request->filled('assigned_to'), fn ($q) => $q->where('assigned_to', $request->integer('assigned_to')))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return ComplaintResource::collection($complaints);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules($tenant['campus_id']));

        $complaint = Complaint::create($data + $tenant + [
            'reference_no' => $this->nextReference($tenant['campus_id']),
            'raised_by' => $request->user()?->id,
            'status' => 'open',
        ]);

        return (new ComplaintResource($complaint->load('student')))->response()->setStatusCode(201);
    }

    public function show(Complaint $complaint): ComplaintResource
    {
        return new ComplaintResource($complaint->load('student'));
    }

    public function update(Request $request, Complaint $complaint): ComplaintResource
    {
        $complaint->update($request->validate($this->rules($complaint->campus_id, false)));

        return new ComplaintResource($complaint->load('student'));
    }

    public function assign(Request $request, Complaint $complaint): ComplaintResource
    {
        $data = $request->validate([
            'assigned_to' => ['required', 'integer', Rule::exists('users', 'id')],
        ]);

        $complaint->forceFill([
            'assigned_to' => $data['assigned_to'],
            'status' => 'in_progress',
        ])->save();

        return new ComplaintResource($complaint->refresh()->load('student'));
    }

    public function resolve(Request $request, Complaint $complaint): ComplaintResource
    {
        $data = $request->validate(['resolution' => ['required', 'string']]);

        $complaint->forceFill([
            'resolution' => $data['resolution'],
            'status' => 'resolved',
            'resolved_at' => now(),
        ])->save();

        return new ComplaintResource($complaint->refresh()->load('student'));
    }

    public function reject(Request $request, Complaint $complaint): ComplaintResource
    {
        $data = $request->validate(['resolution' => ['required', 'string']]);

        $complaint->forceFill([
            'resolution' => $data['resolution'],
            'status' => 'rejected',
            'resolved_at' => now(),
        ])->save();

        return new ComplaintResource($complaint->refresh()->load('student'));
    }

    public function destroy(Complaint $complaint): JsonResponse
    {
        $complaint->delete();

        return response()->json(['message' => 'Complaint removed.']);
    }

    private function nextReference(int $campusId): string
    {
        $sequence = Complaint::withTrashed()->where('campus_id', $campusId)->count() + 1;

        do {
            $reference = sprintf('CMP-%06d', $sequence);
            $sequence++;
        } while (Complaint::withTrashed()->where('campus_id', $campusId)->where('reference_no', $reference)->exists());

        return $reference;
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'student_id' => ['nullable', 'integer', Rule::exists('students', 'id')->where('campus_id', $campusId)],
            'against' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:64'],
            'subject' => [$presence, 'string', 'max:255'],
            'description' => [$presence, 'string'],
            'priority' => ['sometimes', Rule::in(['low', 'medium', 'high'])],
            'assigned_to' => ['nullable', 'integer', Rule::exists('users', 'id')],
        ];
    }
}
