<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConcessionPolicyResource extends JsonResource
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
            'max_amount' => $this->max_amount,
            'criteria' => $this->criteria,
            'priority' => (int) $this->priority,
            'is_stackable' => (bool) $this->is_stackable,
            'requires_approval' => (bool) $this->requires_approval,
            'is_active' => (bool) $this->is_active,
            'academic_year_id' => $this->academic_year_id,
            'academic_year' => $this->whenLoaded('academicYear', fn () => $this->academicYear?->name),
            'class_room_id' => $this->class_room_id,
            'class_room' => $this->whenLoaded('classRoom', fn () => $this->classRoom?->name),
            'description' => $this->description,
            'concessions_count' => $this->whenCounted('concessions'),
            'created_at' => $this->created_at,
        ];
    }
}
