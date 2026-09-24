<?php

namespace App\Http\Resources;

use App\Enums\ReconciliationStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BankReconciliationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'bank_account_id' => $this->bank_account_id,
            'statement_date' => $this->statement_date?->toDateString(),
            'opening_balance' => $this->opening_balance,
            'book_balance' => $this->book_balance,
            'statement_closing_balance' => $this->statement_closing_balance,
            'difference' => $this->difference,
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'is_reconciled' => $this->status === ReconciliationStatus::Completed,
            'notes' => $this->notes,
            'reconciled_at' => $this->reconciled_at,
            'bank_account' => BankAccountResource::make($this->whenLoaded('bankAccount')),
            'created_at' => $this->created_at,
        ];
    }
}
