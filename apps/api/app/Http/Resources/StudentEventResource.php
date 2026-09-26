<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentEventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'title' => $this->title,
            'type' => $this->type,
            'description' => $this->description,
            'starts_on' => $this->starts_on?->toDateString(),
            'ends_on' => $this->ends_on?->toDateString(),
            'venue' => $this->venue,
            'budget' => $this->budget,
            'status' => $this->status,
            'organizer_user_id' => $this->organizer_user_id,
            'organizer' => UserResource::make($this->whenLoaded('organizer')),
            'participants_count' => $this->whenCounted('participants'),
            'participants' => EventParticipantResource::collection($this->whenLoaded('participants')),
            'created_at' => $this->created_at,
        ];
    }
}
