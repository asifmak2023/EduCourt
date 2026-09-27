<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SportEquipmentMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'sport_equipment_id' => $this->sport_equipment_id,
            'equipment' => SportEquipmentResource::make($this->whenLoaded('equipment')),
            'type' => $this->type?->value,
            'quantity' => $this->quantity,
            'balance_after' => $this->balance_after,
            'issued_to' => $this->issued_to,
            'issued_to_user' => UserResource::make($this->whenLoaded('issuedTo')),
            'movement_date' => $this->movement_date?->toDateString(),
            'remarks' => $this->remarks,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
        ];
    }
}
