<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ScholarshipResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'type' => $this->type?->value,
            'type_label' => $this->type?->label(),
            'discount_type' => $this->discount_type?->value,
            'discount_type_label' => $this->discount_type?->label(),
            'value' => $this->value,
            'academic_year_id' => $this->academic_year_id,
            'academic_year' => $this->whenLoaded('academicYear', fn () => $this->academicYear?->name),
            'sponsor' => $this->sponsor,
            'description' => $this->description,
            'is_active' => (bool) $this->is_active,
            'awards_count' => $this->whenCounted('awards'),
            'created_at' => $this->created_at,
        ];
    }
}
