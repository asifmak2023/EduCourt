<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InventoryItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'inventory_category_id' => $this->inventory_category_id,
            'category' => InventoryCategoryResource::make($this->whenLoaded('category')),
            'name' => $this->name,
            'code' => $this->code,
            'unit' => $this->unit,
            'unit_cost' => (float) $this->unit_cost,
            'quantity' => (float) $this->quantity,
            'reorder_level' => (float) $this->reorder_level,
            'is_low_stock' => $this->isLowStock(),
            'is_active' => (bool) $this->is_active,
            'created_at' => $this->created_at,
        ];
    }
}
