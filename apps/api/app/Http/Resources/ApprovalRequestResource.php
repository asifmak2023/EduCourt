<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ApprovalRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'approval_workflow_id' => $this->approval_workflow_id,
            'approvable_type' => $this->approvable_type,
            'approvable_id' => $this->approvable_id,
            'amount' => $this->amount,
            'requested_by' => $this->requested_by,
            'decided_by' => $this->decided_by,
            'status' => $this->status?->value,
            'current_sequence' => $this->current_sequence,
            'notes' => $this->notes,
            'decided_at' => $this->decided_at,
            'workflow' => ApprovalWorkflowResource::make($this->whenLoaded('workflow')),
            'actions' => ApprovalRequestActionResource::collection($this->whenLoaded('actions')),
            'created_at' => $this->created_at,
        ];
    }
}
