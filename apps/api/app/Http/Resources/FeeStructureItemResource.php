<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeeStructureItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'fee_structure_id' => $this->fee_structure_id,
            'fee_head_id' => $this->fee_head_id,
            'name' => $this->name,
            'billing_kind' => $this->billing_kind?->value,
            'exam_term' => $this->exam_term?->value,
            'amount' => $this->amount,
            'is_optional' => $this->is_optional,
            'sort_order' => $this->sort_order,
            'is_active' => $this->is_active,
            'fee_head' => FeeHeadResource::make($this->whenLoaded('feeHead')),
        ];
    }
}
