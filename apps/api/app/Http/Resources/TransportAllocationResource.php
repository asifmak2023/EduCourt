<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransportAllocationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'student_id' => $this->student_id,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'transport_route_id' => $this->transport_route_id,
            'route' => TransportRouteResource::make($this->whenLoaded('route')),
            'transport_route_stop_id' => $this->transport_route_stop_id,
            'stop' => TransportRouteStopResource::make($this->whenLoaded('stop')),
            'vehicle_id' => $this->vehicle_id,
            'vehicle' => VehicleResource::make($this->whenLoaded('vehicle')),
            'direction' => $this->direction?->value,
            'start_date' => $this->start_date,
            'end_date' => $this->end_date,
            'fare' => (float) $this->fare,
            'status' => $this->status?->value,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
        ];
    }
}
