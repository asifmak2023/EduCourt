<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BankAccountResource extends JsonResource
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
            'account_no' => $this->account_no,
            'bank_name' => $this->bank_name,
            'branch' => $this->branch,
            'currency' => $this->currency,
            'opening_balance' => $this->opening_balance,
            'notes' => $this->notes,
            'is_active' => $this->is_active,
            'chart_of_account' => ChartOfAccountResource::make($this->whenLoaded('chartOfAccount')),
            'created_at' => $this->created_at,
        ];
    }
}
