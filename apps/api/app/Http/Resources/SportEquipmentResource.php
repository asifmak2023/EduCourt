<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SportEquipmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'sport_id' => $this->sport_id,
            'sport' => SportResource::make($this->whenLoaded('sport')),
            'name' => $this->name,
            'code' => $this->code,
            'unit' => $this->unit,
            'quantity' => $this->quantity,
            'available_quantity' => $this->available_quantity,
            'unit_cost' => $this->unit_cost,
            'condition' => $this->condition?->value,
            'is_active' => (bool) $this->is_active,
            'is_out_of_stock' => (float) $this->available_quantity <= 0,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
        ];
    }
}
