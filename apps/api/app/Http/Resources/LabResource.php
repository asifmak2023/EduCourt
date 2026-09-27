<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LabResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'name' => $this->name,
            'code' => $this->code,
            'type' => $this->type?->value,
            'location' => $this->location,
            'capacity' => (int) $this->capacity,
            'incharge_user_id' => $this->incharge_user_id,
            'incharge' => UserResource::make($this->whenLoaded('incharge')),
            'is_active' => (bool) $this->is_active,
            'equipment' => LabEquipmentResource::collection($this->whenLoaded('equipment')),
            'created_at' => $this->created_at,
        ];
    }
}
