<?php

namespace App\Models;

use App\Enums\StockEntryType;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class CanteenStockEntry extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'canteen_item_id', 'supplier_id', 'type',
        'reference', 'quantity', 'unit_cost', 'total_cost', 'balance_after',
        'entry_date', 'notes', 'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'type' => StockEntryType::class,
            'quantity' => 'decimal:2',
            'unit_cost' => 'decimal:2',
            'total_cost' => 'decimal:2',
            'balance_after' => 'decimal:2',
            'entry_date' => 'date',
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

    public function item(): BelongsTo
    {
        return $this->belongsTo(CanteenItem::class, 'canteen_item_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(CanteenSupplier::class, 'supplier_id');
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
