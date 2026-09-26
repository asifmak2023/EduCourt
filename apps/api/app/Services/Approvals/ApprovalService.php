<?php

namespace App\Services\Approvals;

use App\Enums\ApprovalActionType;
use App\Enums\ApprovalStatus;
use App\Models\ApprovalRequest;
use App\Models\ApprovalWorkflow;
use App\Models\ApprovalWorkflowStep;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Configurable, multi-step approval engine. Workflows are matched to an
 * approvable entity by key and amount; each step is satisfied by a specific
 * user, role or permission. Financial services call {@see assertMayProceed}
 * before performing a gated operation.
 */
class ApprovalService
{
    public function workflowFor(string $entityKey, int $campusId, float $amount): ?ApprovalWorkflow
    {
        return ApprovalWorkflow::query()
            ->with('steps')
            ->where('campus_id', $campusId)
            ->where('entity_type', $entityKey)
            ->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('min_amount')->orWhere('min_amount', '<=', $amount))
            ->where(fn ($q) => $q->whereNull('max_amount')->orWhere('max_amount', '>=', $amount))
            ->orderByDesc('min_amount')
            ->first();
    }

    public function approvedRequestFor(Model $entity): ?ApprovalRequest
    {
        return ApprovalRequest::query()
            ->where('approvable_type', $entity->getMorphClass())
            ->where('approvable_id', $entity->getKey())
            ->where('status', ApprovalStatus::Approved->value)
            ->latest('id')
            ->first();
    }

    /**
     * @throws ValidationException when an approval workflow applies but has not been satisfied
     */
    public function assertMayProceed(Model $entity, string $entityKey, int $campusId, float $amount): void
    {
        $workflow = $this->workflowFor($entityKey, $campusId, $amount);

        if ($workflow === null) {
            return;
        }

        if ($this->approvedRequestFor($entity) !== null) {
            return;
        }

        throw ValidationException::withMessages([
            'approval' => ["This operation requires approval under workflow [{$workflow->name}]. Submit an approval request first."],
        ]);
    }

    public function request(Model $entity, string $entityKey, float $amount, ?int $userId, ?string $notes = null): ApprovalRequest
    {
        $campusId = (int) $entity->getAttribute('campus_id');
        $workflow = $this->workflowFor($entityKey, $campusId, $amount);

        if ($workflow === null) {
            throw ValidationException::withMessages([
                'workflow' => ['No active approval workflow matches this operation.'],
            ]);
        }

        if ($workflow->steps->isEmpty()) {
            throw ValidationException::withMessages([
                'workflow' => ['The approval workflow has no steps.'],
            ]);
        }

        return ApprovalRequest::create([
            'institution_id' => $entity->getAttribute('institution_id'),
            'campus_id' => $campusId,
            'approval_workflow_id' => $workflow->id,
            'approvable_type' => $entity->getMorphClass(),
            'approvable_id' => $entity->getKey(),
            'amount' => $amount,
            'requested_by' => $userId,
            'status' => ApprovalStatus::Pending,
            'current_sequence' => $workflow->steps->first()->sequence,
            'notes' => $notes,
        ])->load('workflow.steps');
    }

    public function approve(ApprovalRequest $request, User $user, ?string $comment = null): ApprovalRequest
    {
        $this->ensurePending($request);

        $step = $this->currentStep($request);

        $this->authorizeStep($step, $user);

        return DB::transaction(function () use ($request, $step, $user, $comment) {
            $request->actions()->create([
                'sequence' => $step->sequence,
                'user_id' => $user->id,
                'action' => ApprovalActionType::Approved,
                'comment' => $comment,
                'acted_at' => now(),
            ]);

            $next = $request->workflow->steps->firstWhere('sequence', '>', $step->sequence);

            if ($next === null) {
                $request->forceFill([
                    'status' => ApprovalStatus::Approved,
                    'decided_by' => $user->id,
                    'decided_at' => now(),
                ])->save();
            } else {
                $request->forceFill(['current_sequence' => $next->sequence])->save();
            }

            return $request->refresh()->load(['workflow.steps', 'actions']);
        });
    }

    public function reject(ApprovalRequest $request, User $user, ?string $comment = null): ApprovalRequest
    {
        $this->ensurePending($request);

        $step = $this->currentStep($request);

        $this->authorizeStep($step, $user);

        return DB::transaction(function () use ($request, $step, $user, $comment) {
            $request->actions()->create([
                'sequence' => $step->sequence,
                'user_id' => $user->id,
                'action' => ApprovalActionType::Rejected,
                'comment' => $comment,
                'acted_at' => now(),
            ]);

            $request->forceFill([
                'status' => ApprovalStatus::Rejected,
                'decided_by' => $user->id,
                'decided_at' => now(),
            ])->save();

            return $request->refresh()->load(['workflow.steps', 'actions']);
        });
    }

    public function cancel(ApprovalRequest $request, ?int $userId): ApprovalRequest
    {
        $this->ensurePending($request);

        $request->forceFill([
            'status' => ApprovalStatus::Cancelled,
            'decided_by' => $userId,
            'decided_at' => now(),
        ])->save();

        return $request->refresh();
    }

    private function ensurePending(ApprovalRequest $request): void
    {
        if (! $request->isPending()) {
            abort(409, 'This approval request has already been decided.');
        }
    }

    private function currentStep(ApprovalRequest $request): ApprovalWorkflowStep
    {
        $request->loadMissing('workflow.steps');

        $step = $request->workflow?->steps->firstWhere('sequence', $request->current_sequence);

        if ($step === null) {
            abort(409, 'The approval workflow has no matching step.');
        }

        return $step;
    }

    private function authorizeStep(ApprovalWorkflowStep $step, User $user): void
    {
        if ($step->approver_user_id !== null && $step->approver_user_id !== $user->id) {
            abort(403, 'You are not the designated approver for this step.');
        }

        if ($step->required_role !== null && ! $user->hasRole($step->required_role)) {
            abort(403, "This step requires the [{$step->required_role}] role.");
        }

        if ($step->required_permission !== null && ! $user->hasPermissionTo($step->required_permission)) {
            abort(403, "This step requires the [{$step->required_permission}] permission.");
        }
    }
}
