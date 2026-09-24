<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeeVoucherResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'student_id' => $this->student_id,
            'academic_year_id' => $this->academic_year_id,
            'fee_plan_id' => $this->fee_plan_id,
            'fee_installment_id' => $this->fee_installment_id,
            'sequence' => $this->sequence,
            'voucher_no' => $this->voucher_no,
            'due_date' => $this->due_date?->toDateString(),
            'gross_amount' => $this->gross_amount,
            'discount_amount' => $this->discount_amount,
            'amount' => $this->amount,
            'late_fee_amount' => $this->late_fee_amount,
            'late_fee_applied_at' => $this->late_fee_applied_at,
            'paid_amount' => $this->paid_amount,
            'balance' => number_format(max((float) $this->amount - (float) $this->paid_amount, 0), 2, '.', ''),
            'status' => $this->status?->value,
            'issued_at' => $this->issued_at,
            'journal_entry_id' => $this->journal_entry_id,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'fee_plan' => FeePlanResource::make($this->whenLoaded('feePlan')),
            'lines' => FeeVoucherLineResource::collection($this->whenLoaded('lines')),
            'payments' => FeePaymentResource::collection($this->whenLoaded('payments')),
            'created_at' => $this->created_at,
        ];
    }
}
