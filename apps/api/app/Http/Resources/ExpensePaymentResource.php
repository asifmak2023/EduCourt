<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExpensePaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'expense_id' => $this->expense_id,
            'reference' => $this->reference,
            'payment_date' => $this->payment_date?->toDateString(),
            'amount' => $this->amount,
            'method' => $this->method?->value,
            'method_label' => $this->method?->label(),
            'notes' => $this->notes,
            'journal_entry_id' => $this->journal_entry_id,
            'voided_at' => $this->voided_at,
            'is_voided' => $this->isVoided(),
            'expense' => ExpenseResource::make($this->whenLoaded('expense')),
            'created_at' => $this->created_at,
        ];
    }
}
