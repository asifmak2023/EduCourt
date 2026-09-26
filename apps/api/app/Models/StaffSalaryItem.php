<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffSalaryItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'staff_salary_id', 'salary_component_id', 'amount', 'percentage',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'percentage' => 'decimal:2',
        ];
    }

    public function salary(): BelongsTo
    {
        return $this->belongsTo(StaffSalary::class, 'staff_salary_id');
    }

    public function component(): BelongsTo
    {
        return $this->belongsTo(SalaryComponent::class, 'salary_component_id');
    }
}
