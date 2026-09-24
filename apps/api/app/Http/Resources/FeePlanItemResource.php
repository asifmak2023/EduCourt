<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeePlanItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'fee_head_id' => $this->fee_head_id,
            'amount' => $this->amount,
            'is_optional' => $this->is_optional,
            'sort_order' => $this->sort_order,
            'fee_head' => FeeHeadResource::make($this->whenLoaded('feeHead')),
        ];
    }
}
