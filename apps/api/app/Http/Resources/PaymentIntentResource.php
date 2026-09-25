<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentIntentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'gateway' => $this->gateway,
            'amount' => $this->amount,
            'currency' => $this->currency,
            'status' => $this->status?->value,
            'status_label' => $this->status?->label(),
            'checkout_url' => $this->checkout_url,
            'student_id' => $this->student_id,
            'student' => $this->whenLoaded('student', fn () => [
                'id' => $this->student->id,
                'name' => $this->student->full_name,
                'admission_no' => $this->student->admission_no,
            ]),
            'fee_voucher_id' => $this->fee_voucher_id,
            'voucher_no' => $this->whenLoaded('voucher', fn () => $this->voucher?->voucher_no),
            'fee_payment_id' => $this->fee_payment_id,
            'paid_at' => $this->paid_at?->toIso8601String(),
            'created_at' => $this->created_at,
        ];
    }
}
