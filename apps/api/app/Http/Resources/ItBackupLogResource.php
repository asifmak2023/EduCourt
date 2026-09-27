<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ItBackupLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'name' => $this->name,
            'type' => $this->type?->value,
            'status' => $this->status?->value,
            'started_at' => $this->started_at,
            'finished_at' => $this->finished_at,
            'size_mb' => $this->size_mb,
            'location' => $this->location,
            'notes' => $this->notes,
            'checked_by' => $this->checked_by,
            'checker' => UserResource::make($this->whenLoaded('checker')),
            'created_at' => $this->created_at,
        ];
    }
}
