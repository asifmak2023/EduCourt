<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeePaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'student_id' => $this->student_id,
            'fee_voucher_id' => $this->fee_voucher_id,
            'receipt_no' => $this->receipt_no,
            'payment_date' => $this->payment_date?->toDateString(),
            'amount' => $this->amount,
            'method' => $this->method?->value,
            'reference' => $this->reference,
            'status' => $this->status?->value,
            'notes' => $this->notes,
            'journal_entry_id' => $this->journal_entry_id,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'voucher' => FeeVoucherResource::make($this->whenLoaded('voucher')),
            'created_at' => $this->created_at,
        ];
    }
}
