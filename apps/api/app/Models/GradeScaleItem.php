<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GradeScaleItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'grade_scale_id', 'sequence', 'grade', 'min_percentage', 'max_percentage',
        'points', 'remark',
    ];

    protected function casts(): array
    {
        return [
            'sequence' => 'integer',
            'min_percentage' => 'decimal:2',
            'max_percentage' => 'decimal:2',
            'points' => 'decimal:2',
        ];
    }

    public function scale(): BelongsTo
    {
        return $this->belongsTo(GradeScale::class, 'grade_scale_id');
    }
}
