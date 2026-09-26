<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StaffSalaryItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'staff_salary_id' => $this->staff_salary_id,
            'salary_component_id' => $this->salary_component_id,
            'amount' => $this->amount,
            'percentage' => $this->percentage,
            'component' => SalaryComponentResource::make($this->whenLoaded('component')),
        ];
    }
}
