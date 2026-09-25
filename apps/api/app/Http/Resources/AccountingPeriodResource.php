<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AccountingPeriodResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'fiscal_year_id' => $this->fiscal_year_id,
            'fiscal_year' => $this->whenLoaded('fiscalYear', fn () => $this->fiscalYear?->name),
            'name' => $this->name,
            'starts_on' => $this->starts_on?->toDateString(),
            'ends_on' => $this->ends_on?->toDateString(),
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'is_open' => $this->isOpen(),
            'closed_at' => $this->closed_at,
            'closed_by' => $this->whenLoaded('closedBy', fn () => $this->closedBy?->name),
            'locked_at' => $this->locked_at,
            'locked_by' => $this->whenLoaded('lockedBy', fn () => $this->lockedBy?->name),
            'created_at' => $this->created_at,
        ];
    }
}
