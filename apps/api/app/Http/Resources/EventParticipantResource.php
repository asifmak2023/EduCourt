<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventParticipantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_event_id' => $this->student_event_id,
            'event' => StudentEventResource::make($this->whenLoaded('event')),
            'student_id' => $this->student_id,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'role' => $this->role,
            'status' => $this->status,
            'position' => $this->position,
            'remarks' => $this->remarks,
            'created_at' => $this->created_at,
        ];
    }
}
