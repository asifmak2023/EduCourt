<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PayslipItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'label' => $this->label,
            'type' => $this->type?->value,
            'amount' => $this->amount,
            'source' => $this->source,
            'salary_component_id' => $this->salary_component_id,
            'payroll_adjustment_id' => $this->payroll_adjustment_id,
        ];
    }
}
