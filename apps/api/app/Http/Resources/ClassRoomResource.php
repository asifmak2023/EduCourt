<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClassRoomResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'stage_id' => $this->stage_id,
            'name' => $this->name,
            'code' => $this->code,
            'sequence' => $this->sequence,
            'capacity' => $this->capacity,
            'room' => $this->room,
            'in_charge_user_id' => $this->in_charge_user_id,
            'is_active' => $this->is_active,
            'stage' => StageResource::make($this->whenLoaded('stage')),
            'sections' => SectionResource::collection($this->whenLoaded('sections')),
            'created_at' => $this->created_at,
        ];
    }
}
