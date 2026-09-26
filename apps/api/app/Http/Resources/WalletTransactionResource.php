<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WalletTransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'student_wallet_id' => $this->student_wallet_id,
            'type' => $this->type?->value,
            'amount' => $this->amount,
            'balance_after' => $this->balance_after,
            'reference' => $this->reference,
            'description' => $this->description,
            'canteen_sale_id' => $this->canteen_sale_id,
            'transaction_date' => $this->transaction_date?->toDateString(),
            'journal_entry_id' => $this->journal_entry_id,
            'created_at' => $this->created_at,
        ];
    }
}
