<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LabEquipmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'lab_id' => $this->lab_id,
            'name' => $this->name,
            'code' => $this->code,
            'quantity' => (int) $this->quantity,
            'condition' => $this->condition?->value,
            'purchased_on' => $this->purchased_on,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
        ];
    }
}
