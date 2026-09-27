<?php

namespace App\Services\Inventory;

use App\Enums\InventoryMovementType;
use App\Models\InventoryItem;
use App\Models\InventoryStockMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Owns general store stock: movement posting, current balances and low-stock
 * reporting for a campus.
 */
class InventoryService
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function recordMovement(InventoryItem $item, array $data, ?int $userId): InventoryStockMovement
    {
        $type = InventoryMovementType::from($data['type']);
        $quantity = (float) $data['quantity'];

        return DB::transaction(function () use ($item, $data, $userId, $type, $quantity) {
            $locked = InventoryItem::query()->whereKey($item->id)->lockForUpdate()->firstOrFail();

            $delta = match ($type) {
                InventoryMovementType::Purchase, InventoryMovementType::Return => abs($quantity),
                InventoryMovementType::Issue, InventoryMovementType::Wastage => -abs($quantity),
                InventoryMovementType::Adjustment => $quantity,
            };

            $newQuantity = (float) $locked->quantity + $delta;

            if ($newQuantity < 0) {
                throw ValidationException::withMessages([
                    'quantity' => 'Stock movement would drive the quantity below zero.',
                ]);
            }

            $movement = $locked->movements()->create($data + [
                'institution_id' => $locked->institution_id,
                'campus_id' => $locked->campus_id,
                'quantity' => $quantity,
                'created_by' => $userId,
            ]);

            $locked->forceFill(['quantity' => $newQuantity])->save();

            return $movement;
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function summary(): array
    {
        $items = InventoryItem::query()->get();

        $lowStock = $items->filter(fn (InventoryItem $item) => $item->isLowStock());

        return [
            'items' => $items->count(),
            'stock_value' => round((float) $items->sum(fn (InventoryItem $item) => (float) $item->quantity * (float) $item->unit_cost), 2),
            'low_stock' => $lowStock->count(),
            'low_stock_items' => $lowStock->values()->map(fn (InventoryItem $item) => [
                'id' => $item->id,
                'name' => $item->name,
                'code' => $item->code,
                'quantity' => (float) $item->quantity,
                'reorder_level' => (float) $item->reorder_level,
            ]),
        ];
    }
}
