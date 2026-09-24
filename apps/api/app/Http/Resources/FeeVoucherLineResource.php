<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FeeVoucherLineResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'fee_head_id' => $this->fee_head_id,
            'amount' => $this->amount,
            'discount_amount' => $this->discount_amount,
            'net_amount' => number_format((float) $this->amount - (float) $this->discount_amount, 2, '.', ''),
            'fee_head' => FeeHeadResource::make($this->whenLoaded('feeHead')),
        ];
    }
}
