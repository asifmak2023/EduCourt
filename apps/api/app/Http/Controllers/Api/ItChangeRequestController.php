<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ItChangeRequestResource;
use App\Models\ItChangeRequest;
use App\Services\It\ItService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ItChangeRequestController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly ItService $it) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $changes = ItChangeRequest::query()
            ->with(['requester', 'approver'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when($request->filled('risk'), fn ($q) => $q->where('risk', $request->string('risk')))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return ItChangeRequestResource::collection($changes);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();
        $data = $request->validate($this->rules());

        $change = ItChangeRequest::create($data + $tenant + [
            'type' => $data['type'] ?? 'software',
            'risk' => $data['risk'] ?? 'low',
            'status' => $data['status'] ?? 'draft',
            'requested_by' => $request->user()?->id,
        ]);

        return (new ItChangeRequestResource($change->load(['requester', 'approver'])))->response()->setStatusCode(201);
    }

    public function show(ItChangeRequest $changeRequest): ItChangeRequestResource
    {
        return new ItChangeRequestResource($changeRequest->load(['requester', 'approver']));
    }

    public function update(Request $request, ItChangeRequest $changeRequest): ItChangeRequestResource
    {
        $changeRequest->update($request->validate($this->rules(false)));

        return new ItChangeRequestResource($changeRequest->load(['requester', 'approver']));
    }

    public function decide(Request $request, ItChangeRequest $changeRequest): ItChangeRequestResource
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['approved', 'rejected', 'implemented'])],
            'decision_notes' => ['nullable', 'string'],
            'implemented_on' => ['nullable', 'date'],
        ]);

        return new ItChangeRequestResource(
            $this->it->decideChange($changeRequest, $data, $request->user()?->id)->load(['requester', 'approver'])
        );
    }

    public function destroy(ItChangeRequest $changeRequest): JsonResponse
    {
        $changeRequest->delete();

        return response()->json(['message' => 'Change request removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'title' => [$presence, 'string', 'max:255'],
            'description' => [$presence, 'string'],
            'type' => ['sometimes', Rule::in(['hardware', 'software', 'network', 'policy', 'other'])],
            'risk' => ['sometimes', Rule::in(['low', 'medium', 'high'])],
            'status' => ['sometimes', Rule::in(['draft', 'submitted'])],
            'planned_on' => ['nullable', 'date'],
            'rollback_plan' => ['nullable', 'string'],
        ];
    }
}
