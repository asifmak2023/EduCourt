<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PtmSlotResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'ptm_event_id' => $this->ptm_event_id,
            'teacher_user_id' => $this->teacher_user_id,
            'teacher' => UserResource::make($this->whenLoaded('teacher')),
            'start_time' => $this->start_time,
            'end_time' => $this->end_time,
            'capacity' => $this->capacity,
            'booked' => $this->booked,
            'available' => max(0, (int) $this->capacity - (int) $this->booked),
            'room' => $this->room,
            'bookings' => PtmBookingResource::collection($this->whenLoaded('bookings')),
            'created_at' => $this->created_at,
        ];
    }
}
