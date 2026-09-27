<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VisitorLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'name' => $this->name,
            'phone' => $this->phone,
            'id_type' => $this->id_type,
            'id_number' => $this->id_number,
            'purpose' => $this->purpose,
            'person_to_meet' => $this->person_to_meet,
            'badge_no' => $this->badge_no,
            'in_time' => $this->in_time,
            'out_time' => $this->out_time,
            'is_inside' => $this->out_time === null,
            'notes' => $this->notes,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
        ];
    }
}
