<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ItAssetAssignmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'it_asset_id' => $this->it_asset_id,
            'asset' => ItAssetResource::make($this->whenLoaded('asset')),
            'assigned_to' => $this->assigned_to,
            'assignee' => UserResource::make($this->whenLoaded('assignee')),
            'assigned_on' => $this->assigned_on?->toDateString(),
            'returned_on' => $this->returned_on?->toDateString(),
            'condition' => $this->condition,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
        ];
    }
}
