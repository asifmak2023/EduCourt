<?php

namespace App\Enums;

enum StockEntryType: string
{
    case Purchase = 'purchase';
    case Adjustment = 'adjustment';
    case Wastage = 'wastage';
    case Return = 'return';

    /**
     * Signed change applied to the item's on-hand quantity. Purchases and
     * returns add stock, wastage removes it, and an adjustment carries its own
     * signed quantity so it can correct either way.
     */
    public function stockDelta(int|float $quantity): float
    {
        return match ($this) {
            self::Purchase, self::Return => abs((float) $quantity),
            self::Wastage => -abs((float) $quantity),
            self::Adjustment => (float) $quantity,
        };
    }

    public function movesValue(): bool
    {
        return $this !== self::Adjustment;
    }
}
