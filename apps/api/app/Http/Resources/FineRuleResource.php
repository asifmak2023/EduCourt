<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FineRuleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'category' => $this->category?->value,
            'category_label' => $this->category?->label(),
            'amount' => $this->amount,
            'fee_head_id' => $this->fee_head_id,
            'fee_head' => $this->whenLoaded('feeHead', fn () => $this->feeHead?->name),
            'is_active' => (bool) $this->is_active,
            'description' => $this->description,
            'fines_count' => $this->whenCounted('fines'),
            'created_at' => $this->created_at,
        ];
    }
}
