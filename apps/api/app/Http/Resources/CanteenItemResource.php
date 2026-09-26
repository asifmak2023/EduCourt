<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CanteenItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'institution_id' => $this->institution_id,
            'campus_id' => $this->campus_id,
            'name' => $this->name,
            'code' => $this->code,
            'category' => $this->category,
            'unit' => $this->unit,
            'price' => $this->price,
            'cost_price' => $this->cost_price,
            'track_stock' => (bool) $this->track_stock,
            'stock_quantity' => $this->stock_quantity,
            'reorder_level' => $this->reorder_level,
            'is_low_stock' => $this->isLowStock(),
            'is_active' => (bool) $this->is_active,
            'description' => $this->description,
            'created_at' => $this->created_at,
        ];
    }
}
