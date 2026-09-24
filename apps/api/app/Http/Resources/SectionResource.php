<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SectionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'class_room_id' => $this->class_room_id,
            'name' => $this->name,
            'capacity' => $this->capacity,
            'in_charge_user_id' => $this->in_charge_user_id,
            'is_active' => $this->is_active,
            'class_room' => ClassRoomResource::make($this->whenLoaded('classRoom')),
            'created_at' => $this->created_at,
        ];
    }
}
