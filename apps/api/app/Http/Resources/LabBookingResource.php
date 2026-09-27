<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LabBookingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'lab_id' => $this->lab_id,
            'lab' => LabResource::make($this->whenLoaded('lab')),
            'class_room_id' => $this->class_room_id,
            'class_room' => ClassRoomResource::make($this->whenLoaded('classRoom')),
            'teacher_user_id' => $this->teacher_user_id,
            'teacher' => UserResource::make($this->whenLoaded('teacher')),
            'session_date' => $this->session_date,
            'start_time' => $this->start_time,
            'end_time' => $this->end_time,
            'purpose' => $this->purpose,
            'status' => $this->status?->value,
            'created_at' => $this->created_at,
        ];
    }
}
