<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CanteenSaleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'bill_no' => $this->bill_no,
            'student_id' => $this->student_id,
            'student' => StudentResource::make($this->whenLoaded('student')),
            'wallet_id' => $this->wallet_id,
            'customer_name' => $this->customer_name,
            'payment_method' => $this->payment_method?->value,
            'subtotal' => $this->subtotal,
            'discount' => $this->discount,
            'total' => $this->total,
            'cost_total' => $this->cost_total,
            'status' => $this->status?->value,
            'sold_on' => $this->sold_on?->toDateString(),
            'notes' => $this->notes,
            'journal_entry_id' => $this->journal_entry_id,
            'items' => CanteenSaleItemResource::collection($this->whenLoaded('items')),
            'voided_at' => $this->voided_at,
            'created_at' => $this->created_at,
        ];
    }
}
