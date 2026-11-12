<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SalaryStructureResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'designation_id' => $this->designation_id,
            'name' => $this->name,
            'version' => (int) $this->version,
            'is_current' => $this->superseded_by_id === null,
            'superseded_by_id' => $this->superseded_by_id,
            'basic_salary' => $this->basic_salary,
            'currency' => $this->currency,
            'effective_from' => $this->effective_from?->toDateString(),
            'effective_to' => $this->effective_to?->toDateString(),
            'is_active' => (bool) $this->is_active,
            'increment_type' => $this->increment_type?->value,
            'increment_type_label' => $this->increment_type?->label(),
            'increment_value' => $this->increment_value,
            'increment_every_months' => $this->increment_every_months,
            'notes' => $this->notes,
            'items' => SalaryStructureItemResource::collection($this->whenLoaded('items')),
            'designation' => DesignationResource::make($this->whenLoaded('designation')),
            'created_at' => $this->created_at,
        ];
    }
}
