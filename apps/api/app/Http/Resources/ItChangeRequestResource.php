<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ItChangeRequestResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'title' => $this->title,
            'description' => $this->description,
            'type' => $this->type,
            'risk' => $this->risk?->value,
            'status' => $this->status?->value,
            'requested_by' => $this->requested_by,
            'requester' => UserResource::make($this->whenLoaded('requester')),
            'approved_by' => $this->approved_by,
            'approver' => UserResource::make($this->whenLoaded('approver')),
            'planned_on' => $this->planned_on?->toDateString(),
            'implemented_on' => $this->implemented_on?->toDateString(),
            'rollback_plan' => $this->rollback_plan,
            'decision_notes' => $this->decision_notes,
            'decided_at' => $this->decided_at,
            'created_at' => $this->created_at,
        ];
    }
}
