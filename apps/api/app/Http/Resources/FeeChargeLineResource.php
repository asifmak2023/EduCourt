<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeeChargeLineResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'fee_charge_id' => $this->fee_charge_id,
            'fee_head_id' => $this->fee_head_id,
            'description' => $this->description,
            'amount' => $this->amount,
            'discount_amount' => $this->discount_amount,
            'fee_head' => FeeHeadResource::make($this->whenLoaded('feeHead')),
        ];
    }
}
