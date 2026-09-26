<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CanteenSaleItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'canteen_item_id' => $this->canteen_item_id,
            'item_name' => $this->item_name,
            'quantity' => $this->quantity,
            'unit_price' => $this->unit_price,
            'unit_cost' => $this->unit_cost,
            'line_total' => $this->line_total,
        ];
    }
}
