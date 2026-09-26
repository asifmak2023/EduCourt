<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaxReturnDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'tax_return_id', 'uploaded_by', 'name', 'file_path', 'is_required', 'uploaded_at',
    ];

    protected function casts(): array
    {
        return [
            'is_required' => 'boolean',
            'uploaded_at' => 'datetime',
        ];
    }

    public function taxReturn(): BelongsTo
    {
        return $this->belongsTo(TaxReturn::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
