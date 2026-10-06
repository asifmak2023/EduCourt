<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeeReceiptResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'student_id' => $this->student_id,
            'receipt_no' => $this->receipt_no,
            'payment_date' => $this->payment_date?->toDateString(),
            'amount' => $this->amount,
            'method' => $this->method?->value,
            'method_label' => $this->method?->label(),
            'reference' => $this->reference,
            'notes' => $this->notes,
            'status' => $this->status?->value,
            'journal_entry_id' => $this->journal_entry_id,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'allocations' => $this->whenLoaded('allocations', fn () => $this->allocations->map(fn ($allocation) => [
                'id' => $allocation->id,
                'fee_charge_id' => $allocation->fee_charge_id,
                'amount' => $allocation->amount,
                'charge' => $allocation->relationLoaded('charge')
                    ? FeeChargeResource::make($allocation->charge)
                    : null,
            ])),
            'created_at' => $this->created_at,
        ];
    }
}
