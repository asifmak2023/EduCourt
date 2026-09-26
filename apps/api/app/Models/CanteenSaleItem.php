<?php

namespace App\Models;

use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CanteenSaleItem extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory;

    protected $fillable = [
        'institution_id', 'campus_id', 'canteen_sale_id', 'canteen_item_id',
        'item_name', 'quantity', 'unit_price', 'unit_cost', 'line_total',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'unit_price' => 'decimal:2',
            'unit_cost' => 'decimal:2',
            'line_total' => 'decimal:2',
        ];
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(CanteenSale::class, 'canteen_sale_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(CanteenItem::class, 'canteen_item_id');
    }
}
