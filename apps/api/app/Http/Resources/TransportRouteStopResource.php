<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransportRouteStopResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'transport_route_id' => $this->transport_route_id,
            'name' => $this->name,
            'sequence' => (int) $this->sequence,
            'pickup_time' => $this->pickup_time,
            'drop_time' => $this->drop_time,
            'fare' => $this->fare === null ? null : (float) $this->fare,
            'created_at' => $this->created_at,
        ];
    }
}
