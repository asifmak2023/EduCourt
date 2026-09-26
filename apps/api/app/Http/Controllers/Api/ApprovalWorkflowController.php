<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\ApprovalWorkflowResource;
use App\Models\ApprovalWorkflow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ApprovalWorkflowController extends Controller
{
    use StampsAcademicTenant;

    public function index(Request $request): AnonymousResourceCollection
    {
        $workflows = ApprovalWorkflow::query()
            ->with('steps')
            ->when($request->filled('entity_type'), fn ($q) => $q->where('entity_type', $request->string('entity_type')))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name')
            ->paginate($request->integer('per_page', 50));

        return ApprovalWorkflowResource::collection($workflows);
    }

    public function store(Request $request): JsonResponse
    {
        $tenant = $this->academicTenantAttributes();

        $data = $request->validate($this->rules($tenant['campus_id']));

        $workflow = DB::transaction(function () use ($data, $tenant) {
            $steps = $data['steps'];
            unset($data['steps']);

            $workflow = ApprovalWorkflow::create($data + $tenant);
            $workflow->steps()->createMany($steps);

            return $workflow;
        });

        return (new ApprovalWorkflowResource($workflow->load('steps')))->response()->setStatusCode(201);
    }

    public function show(ApprovalWorkflow $approvalWorkflow): ApprovalWorkflowResource
    {
        return new ApprovalWorkflowResource($approvalWorkflow->load('steps'));
    }

    public function update(Request $request, ApprovalWorkflow $approvalWorkflow): ApprovalWorkflowResource
    {
        $data = $request->validate($this->rules($approvalWorkflow->campus_id, $approvalWorkflow->id, false));

        DB::transaction(function () use ($data, $approvalWorkflow) {
            if (array_key_exists('steps', $data)) {
                $steps = $data['steps'];
                unset($data['steps']);

                $approvalWorkflow->steps()->delete();
                $approvalWorkflow->steps()->createMany($steps);
            }

            $approvalWorkflow->update($data);
        });

        return new ApprovalWorkflowResource($approvalWorkflow->load('steps'));
    }

    public function destroy(ApprovalWorkflow $approvalWorkflow): JsonResponse
    {
        $approvalWorkflow->delete();

        return response()->json(['message' => 'Approval workflow removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(int $campusId, ?int $ignoreId = null, bool $required = true): array
    {
        $presence = $required ? 'required' : 'sometimes';

        return [
            'name' => [$presence, 'string', 'max:255'],
            'code' => [
                $presence, 'string', 'max:48',
                Rule::unique('approval_workflows', 'code')->where('campus_id', $campusId)->ignore($ignoreId),
            ],
            'entity_type' => [$presence, Rule::in(array_keys(config('approvals.entities')))],
            'min_amount' => ['nullable', 'numeric', 'min:0'],
            'max_amount' => ['nullable', 'numeric', 'gte:min_amount'],
            'is_active' => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string'],
            'steps' => [$presence, 'array', 'min:1'],
            'steps.*.sequence' => ['required_with:steps', 'integer', 'min:1', 'distinct'],
            'steps.*.label' => ['required_with:steps', 'string', 'max:255'],
            'steps.*.required_role' => ['nullable', 'string', 'max:64'],
            'steps.*.required_permission' => ['nullable', 'string', 'max:96'],
            'steps.*.approver_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
        ];
    }
}
