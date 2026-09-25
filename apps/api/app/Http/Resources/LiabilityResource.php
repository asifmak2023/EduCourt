<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LiabilityResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'chart_of_account_id' => $this->chart_of_account_id,
            'code' => $this->code,
            'name' => $this->name,
            'type' => $this->type?->value,
            'type_label' => $this->type?->label(),
            'lender' => $this->lender,
            'principal_amount' => $this->principal_amount,
            'interest_rate' => $this->interest_rate,
            'starts_on' => $this->starts_on?->toDateString(),
            'matures_on' => $this->matures_on?->toDateString(),
            'installment_amount' => $this->installment_amount,
            'outstanding_amount' => $this->outstanding_amount,
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'settled_on' => $this->settled_on?->toDateString(),
            'notes' => $this->notes,
            'chart_of_account' => ChartOfAccountResource::make($this->whenLoaded('chartOfAccount')),
            'created_at' => $this->created_at,
        ];
    }
}
