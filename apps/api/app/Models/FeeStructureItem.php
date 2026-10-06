<?php

namespace App\Models;

use App\Enums\BillingKind;
use App\Enums\ExamTerm;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeeStructureItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'fee_structure_id', 'fee_head_id', 'name', 'billing_kind', 'exam_term',
        'amount', 'is_optional', 'sort_order', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'billing_kind' => BillingKind::class,
            'exam_term' => ExamTerm::class,
            'amount' => 'decimal:2',
            'is_optional' => 'boolean',
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function structure(): BelongsTo
    {
        return $this->belongsTo(FeeStructure::class, 'fee_structure_id');
    }

    public function feeHead(): BelongsTo
    {
        return $this->belongsTo(FeeHead::class);
    }
}
