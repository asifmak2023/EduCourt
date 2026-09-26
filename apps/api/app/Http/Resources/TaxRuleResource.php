<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaxRuleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'tax_account_id' => $this->tax_account_id,
            'name' => $this->name,
            'code' => $this->code,
            'type' => $this->type?->value,
            'applies_to' => $this->applies_to?->value,
            'rate' => $this->rate,
            'effective_from' => $this->effective_from?->toDateString(),
            'effective_to' => $this->effective_to?->toDateString(),
            'is_active' => $this->is_active,
            'description' => $this->description,
            'tax_account' => ChartOfAccountResource::make($this->whenLoaded('taxAccount')),
            'created_at' => $this->created_at,
        ];
    }
}
