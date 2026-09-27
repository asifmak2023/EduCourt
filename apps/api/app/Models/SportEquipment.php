<?php

namespace App\Models;

use App\Enums\EquipmentCondition;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class SportEquipment extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'sport_id', 'name', 'code', 'unit',
        'quantity', 'available_quantity', 'unit_cost', 'condition', 'is_active', 'notes',
    ];

    protected $attributes = [
        'unit' => 'piece',
        'quantity' => 0,
        'available_quantity' => 0,
        'unit_cost' => 0,
        'condition' => 'good',
        'is_active' => true,
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'available_quantity' => 'decimal:2',
            'unit_cost' => 'decimal:2',
            'condition' => EquipmentCondition::class,
            'is_active' => 'boolean',
        ];
    }

    public function sport(): BelongsTo
    {
        return $this->belongsTo(Sport::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(SportEquipmentMovement::class);
    }

    public function isFullyIssued(): bool
    {
        return (float) $this->available_quantity <= 0;
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
