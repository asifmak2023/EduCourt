<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActivityLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'log_name' => $this->log_name,
            'description' => $this->description,
            'event' => $this->event,
            'subject_type' => $this->subject_type ? class_basename($this->subject_type) : null,
            'subject_id' => $this->subject_id,
            'causer_type' => $this->causer_type ? class_basename($this->causer_type) : null,
            'causer_id' => $this->causer_id,
            'causer_name' => $this->whenLoaded('causer', fn () => $this->causer?->name),
            'properties' => $this->properties,
            'created_at' => $this->created_at,
        ];
    }
}
