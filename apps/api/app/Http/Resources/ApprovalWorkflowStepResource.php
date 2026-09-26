<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ApprovalWorkflowStepResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'approval_workflow_id' => $this->approval_workflow_id,
            'sequence' => $this->sequence,
            'label' => $this->label,
            'required_role' => $this->required_role,
            'required_permission' => $this->required_permission,
            'approver_user_id' => $this->approver_user_id,
        ];
    }
}
