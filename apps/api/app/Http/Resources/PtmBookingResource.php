<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PtmBookingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'ptm_slot_id' => $this->ptm_slot_id,
            'slot' => PtmSlotResource::make($this->whenLoaded('slot')),
            'student_id' => $this->student_id,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'guardian_name' => $this->guardian_name,
            'guardian_phone' => $this->guardian_phone,
            'notes' => $this->notes,
            'status' => $this->status?->value,
            'created_at' => $this->created_at,
        ];
    }
}
