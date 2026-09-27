<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ItSystemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'name' => $this->name,
            'type' => $this->type,
            'url' => $this->url,
            'owner' => $this->owner,
            'status' => $this->status?->value,
            'uptime_percent' => $this->uptime_percent,
            'last_checked_at' => $this->last_checked_at,
            'notes' => $this->notes,
            'created_at' => $this->created_at,
        ];
    }
}
