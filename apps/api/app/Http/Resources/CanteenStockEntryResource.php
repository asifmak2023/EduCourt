<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CanteenStockEntryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'campus_id' => $this->campus_id,
            'canteen_item_id' => $this->canteen_item_id,
            'item' => CanteenItemResource::make($this->whenLoaded('item')),
            'supplier_id' => $this->supplier_id,
            'supplier' => CanteenSupplierResource::make($this->whenLoaded('supplier')),
            'type' => $this->type?->value,
            'reference' => $this->reference,
            'quantity' => $this->quantity,
            'unit_cost' => $this->unit_cost,
            'total_cost' => $this->total_cost,
            'balance_after' => $this->balance_after,
            'entry_date' => $this->entry_date?->toDateString(),
            'notes' => $this->notes,
            'recorded_by' => $this->recorded_by,
            'created_at' => $this->created_at,
        ];
    }
}
