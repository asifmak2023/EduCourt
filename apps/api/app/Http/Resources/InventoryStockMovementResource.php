<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InventoryStockMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'inventory_item_id' => $this->inventory_item_id,
            'item' => InventoryItemResource::make($this->whenLoaded('item')),
            'type' => $this->type?->value,
            'quantity' => (float) $this->quantity,
            'unit_cost' => (float) $this->unit_cost,
            'reference' => $this->reference,
            'notes' => $this->notes,
            'moved_on' => $this->moved_on,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
        ];
    }
}
