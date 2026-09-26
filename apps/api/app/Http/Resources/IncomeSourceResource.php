<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IncomeSourceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'income_account_id' => $this->income_account_id,
            'name' => $this->name,
            'code' => $this->code,
            'category' => $this->category?->value,
            'description' => $this->description,
            'is_active' => $this->is_active,
            'income_account' => ChartOfAccountResource::make($this->whenLoaded('incomeAccount')),
            'created_at' => $this->created_at,
        ];
    }
}
