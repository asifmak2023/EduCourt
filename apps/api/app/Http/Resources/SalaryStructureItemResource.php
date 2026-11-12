<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SalaryStructureItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'salary_structure_id' => $this->salary_structure_id,
            'salary_component_id' => $this->salary_component_id,
            'amount' => $this->amount,
            'percentage' => $this->percentage,
            'sort_order' => $this->sort_order,
            'component' => SalaryComponentResource::make($this->whenLoaded('component')),
        ];
    }
}
