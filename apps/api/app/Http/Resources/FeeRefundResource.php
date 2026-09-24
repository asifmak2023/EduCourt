<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeeRefundResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'student_id' => $this->student_id,
            'fee_payment_id' => $this->fee_payment_id,
            'receipt_no' => $this->receipt_no,
            'refund_date' => $this->refund_date?->toDateString(),
            'amount' => $this->amount,
            'method' => $this->method?->value,
            'reason' => $this->reason,
            'status' => $this->status?->value,
            'journal_entry_id' => $this->journal_entry_id,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'payment' => FeePaymentResource::make($this->whenLoaded('payment')),
            'created_at' => $this->created_at,
        ];
    }
}
