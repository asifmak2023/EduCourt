<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HostelResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'name' => $this->name,
            'code' => $this->code,
            'type' => $this->type?->value,
            'warden_user_id' => $this->warden_user_id,
            'warden' => UserResource::make($this->whenLoaded('warden')),
            'warden_name' => $this->warden_name,
            'warden_phone' => $this->warden_phone,
            'address' => $this->address,
            'capacity' => (int) $this->capacity,
            'is_active' => (bool) $this->is_active,
            'rooms' => HostelRoomResource::collection($this->whenLoaded('rooms')),
            'rooms_count' => $this->whenCounted('rooms'),
            'created_at' => $this->created_at,
        ];
    }
}
