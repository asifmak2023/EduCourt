<?php

namespace App\Models;

use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class CanteenItem extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'name', 'code', 'category', 'unit',
        'price', 'cost_price', 'track_stock', 'stock_quantity', 'reorder_level',
        'is_active', 'description',
    ];

    protected $attributes = [
        'unit' => 'piece',
        'price' => 0,
        'cost_price' => 0,
        'track_stock' => true,
        'stock_quantity' => 0,
        'reorder_level' => 0,
        'is_active' => true,
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'cost_price' => 'decimal:2',
            'stock_quantity' => 'decimal:2',
            'reorder_level' => 'decimal:2',
            'track_stock' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function campus(): BelongsTo
    {
        return $this->belongsTo(Campus::class);
    }

    public function stockEntries(): HasMany
    {
        return $this->hasMany(CanteenStockEntry::class);
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(CanteenSaleItem::class);
    }

    public function isLowStock(): bool
    {
        return $this->track_stock && (float) $this->stock_quantity <= (float) $this->reorder_level;
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
