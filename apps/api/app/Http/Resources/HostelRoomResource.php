<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HostelRoomResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'hostel_id' => $this->hostel_id,
            'room_no' => $this->room_no,
            'floor' => $this->floor,
            'type' => $this->type?->value,
            'capacity' => (int) $this->capacity,
            'occupied' => (int) $this->occupied,
            'available' => $this->availableBeds(),
            'monthly_fee' => (float) $this->monthly_fee,
            'is_active' => (bool) $this->is_active,
            'created_at' => $this->created_at,
        ];
    }
}
