<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HelpdeskTicketResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'ticket_no' => $this->ticket_no,
            'subject' => $this->subject,
            'description' => $this->description,
            'category' => $this->category,
            'priority' => $this->priority?->value,
            'status' => $this->status?->value,
            'reported_by' => $this->reported_by,
            'reporter' => UserResource::make($this->whenLoaded('reporter')),
            'assigned_to' => $this->assigned_to,
            'assignee' => UserResource::make($this->whenLoaded('assignee')),
            'it_asset_id' => $this->it_asset_id,
            'asset' => ItAssetResource::make($this->whenLoaded('asset')),
            'sla_due_at' => $this->sla_due_at,
            'is_overdue' => $this->isOverdue(),
            'resolved_at' => $this->resolved_at,
            'closed_at' => $this->closed_at,
            'resolution' => $this->resolution,
            'comments_count' => $this->whenCounted('comments'),
            'created_at' => $this->created_at,
        ];
    }
}
