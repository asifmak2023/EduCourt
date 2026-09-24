<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AcademicYearResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'name' => $this->name,
            'code' => $this->code,
            'starts_on' => $this->starts_on?->toDateString(),
            'ends_on' => $this->ends_on?->toDateString(),
            'status' => $this->status,
            'is_current' => $this->is_current,
            'notes' => $this->notes,
            'terms' => TermResource::collection($this->whenLoaded('terms')),
            'created_at' => $this->created_at,
        ];
    }
}
