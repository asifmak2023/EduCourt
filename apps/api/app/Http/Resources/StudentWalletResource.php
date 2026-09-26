<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentWalletResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'student_id' => $this->student_id,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'balance' => $this->balance,
            'daily_limit' => $this->daily_limit,
            'low_balance_threshold' => $this->low_balance_threshold,
            'is_active' => (bool) $this->is_active,
            'transactions' => WalletTransactionResource::collection($this->whenLoaded('transactions')),
            'created_at' => $this->created_at,
        ];
    }
}
