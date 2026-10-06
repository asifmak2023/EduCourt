<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeeChargeLine extends Model
{
    use HasFactory;

    protected $fillable = [
        'fee_charge_id', 'fee_head_id', 'description', 'amount', 'discount_amount',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'discount_amount' => 'decimal:2',
        ];
    }

    public function charge(): BelongsTo
    {
        return $this->belongsTo(FeeCharge::class, 'fee_charge_id');
    }

    public function feeHead(): BelongsTo
    {
        return $this->belongsTo(FeeHead::class);
    }
}
