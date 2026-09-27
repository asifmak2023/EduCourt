<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransportRouteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'name' => $this->name,
            'code' => $this->code,
            'start_point' => $this->start_point,
            'end_point' => $this->end_point,
            'distance_km' => (float) $this->distance_km,
            'fare' => (float) $this->fare,
            'vehicle_id' => $this->vehicle_id,
            'vehicle' => VehicleResource::make($this->whenLoaded('vehicle')),
            'is_active' => (bool) $this->is_active,
            'stops' => TransportRouteStopResource::collection($this->whenLoaded('stops')),
            'stops_count' => $this->whenCounted('stops'),
            'allocations_count' => $this->whenCounted('allocations'),
            'created_at' => $this->created_at,
        ];
    }
}
