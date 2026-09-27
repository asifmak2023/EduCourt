<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PtmEventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'title' => $this->title,
            'description' => $this->description,
            'event_date' => $this->event_date,
            'venue' => $this->venue,
            'status' => $this->status?->value,
            'created_by' => $this->created_by,
            'slots' => PtmSlotResource::collection($this->whenLoaded('slots')),
            'slots_count' => $this->whenCounted('slots'),
            'created_at' => $this->created_at,
        ];
    }
}
