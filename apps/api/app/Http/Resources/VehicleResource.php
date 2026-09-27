<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VehicleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'name' => $this->name,
            'registration_no' => $this->registration_no,
            'type' => $this->type?->value,
            'capacity' => (int) $this->capacity,
            'model' => $this->model,
            'driver_user_id' => $this->driver_user_id,
            'driver' => UserResource::make($this->whenLoaded('driver')),
            'driver_name' => $this->driver_name,
            'driver_phone' => $this->driver_phone,
            'conductor_name' => $this->conductor_name,
            'is_active' => (bool) $this->is_active,
            'created_at' => $this->created_at,
        ];
    }
}
