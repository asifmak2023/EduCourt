<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HostelAllocationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'hostel_id' => $this->hostel_id,
            'hostel' => HostelResource::make($this->whenLoaded('hostel')),
            'hostel_room_id' => $this->hostel_room_id,
            'room' => HostelRoomResource::make($this->whenLoaded('room')),
            'student_id' => $this->student_id,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'bed_no' => $this->bed_no,
            'allocated_on' => $this->allocated_on,
            'vacated_on' => $this->vacated_on,
            'monthly_fee' => (float) $this->monthly_fee,
            'status' => $this->status?->value,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
        ];
    }
}
