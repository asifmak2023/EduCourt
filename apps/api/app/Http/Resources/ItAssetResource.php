<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ItAssetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'name' => $this->name,
            'asset_tag' => $this->asset_tag,
            'category' => $this->category,
            'brand' => $this->brand,
            'model_no' => $this->model_no,
            'serial_no' => $this->serial_no,
            'purchase_date' => $this->purchase_date?->toDateString(),
            'cost' => $this->cost,
            'warranty_until' => $this->warranty_until?->toDateString(),
            'under_warranty' => $this->isUnderWarranty(),
            'status' => $this->status?->value,
            'assigned_to' => $this->assigned_to,
            'assigned_user' => UserResource::make($this->whenLoaded('assignedUser')),
            'assigned_on' => $this->assigned_on?->toDateString(),
            'location' => $this->location,
            'vendor' => $this->vendor,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
        ];
    }
}
