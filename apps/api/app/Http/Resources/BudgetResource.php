<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BudgetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $lines = $this->relationLoaded('lines') ? $this->lines : collect();

        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'fiscal_year_id' => $this->fiscal_year_id,
            'name' => $this->name,
            'period_type' => $this->period_type?->value,
            'starts_on' => $this->starts_on?->toDateString(),
            'ends_on' => $this->ends_on?->toDateString(),
            'status' => $this->status?->value,
            'notes' => $this->notes,
            'approved_at' => $this->approved_at,
            'fiscal_year' => FiscalYearResource::make($this->whenLoaded('fiscalYear')),
            'lines' => BudgetLineResource::collection($this->whenLoaded('lines')),
            'total_budget' => number_format((float) $lines->sum('amount'), 2, '.', ''),
            'created_at' => $this->created_at,
        ];
    }
}
