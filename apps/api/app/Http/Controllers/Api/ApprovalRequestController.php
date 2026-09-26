<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ApprovalRequestResource;
use App\Models\ApprovalRequest;
use App\Services\Approvals\ApprovalService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class ApprovalRequestController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly ApprovalService $service) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $requests = ApprovalRequest::query()
            ->with(['workflow.steps', 'actions'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('entity_type'), function ($q) use ($request) {
                $class = config('approvals.entities.'.$request->string('entity_type')->toString());

                if ($class === null) {
                    return $q->whereRaw('1 = 0');
                }

                return $q->where('approvable_type', (new $class)->getMorphClass());
            })
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 25));

        return ApprovalRequestResource::collection($requests);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate([
            'entity_type' => ['required', Rule::in(array_keys(config('approvals.entities')))],
            'entity_id' => ['required', 'integer'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        /** @var class-string<Model> $class */
        $class = config('approvals.entities.'.$data['entity_type']);
        $entity = $class::query()->findOrFail($data['entity_id']);

        if ((int) $entity->getAttribute('campus_id') !== $tenant['campus_id']) {
            abort(403, 'The entity belongs to another campus.');
        }

        $approval = $this->service->request(
            $entity,
            $data['entity_type'],
            (float) ($data['amount'] ?? $this->deriveAmount($entity)),
            $request->user()->id,
            $data['notes'] ?? null,
        );

        return (new ApprovalRequestResource($approval->load(['workflow.steps', 'actions'])))
            ->response()
            ->setStatusCode(201);
    }

    public function show(ApprovalRequest $approvalRequest): ApprovalRequestResource
    {
        return new ApprovalRequestResource($approvalRequest->load(['workflow.steps', 'actions']));
    }

    public function approve(Request $request, ApprovalRequest $approvalRequest): ApprovalRequestResource
    {
        $data = $request->validate(['comment' => ['nullable', 'string']]);

        $approval = $this->service->approve($approvalRequest, $request->user(), $data['comment'] ?? null);

        return new ApprovalRequestResource($approval->load(['workflow.steps', 'actions']));
    }

    public function reject(Request $request, ApprovalRequest $approvalRequest): ApprovalRequestResource
    {
        $data = $request->validate(['comment' => ['nullable', 'string']]);

        $approval = $this->service->reject($approvalRequest, $request->user(), $data['comment'] ?? null);

        return new ApprovalRequestResource($approval->load(['workflow.steps', 'actions']));
    }

    public function cancel(ApprovalRequest $approvalRequest): ApprovalRequestResource
    {
        $approval = $this->service->cancel($approvalRequest, request()->user()->id);

        return new ApprovalRequestResource($approval->load(['workflow.steps', 'actions']));
    }

    private function deriveAmount(Model $entity): float
    {
        foreach (['total', 'amount', 'tax_amount', 'gross_amount'] as $attribute) {
            $value = $entity->getAttribute($attribute);

            if ($value !== null) {
                return (float) $value;
            }
        }

        return 0.0;
    }
}
