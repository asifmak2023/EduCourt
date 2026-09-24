<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BudgetLineResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'chart_of_account_id' => $this->chart_of_account_id,
            'amount' => $this->amount,
            'notes' => $this->notes,
            'account' => ChartOfAccountResource::make($this->whenLoaded('chartOfAccount')),
        ];
    }
}
