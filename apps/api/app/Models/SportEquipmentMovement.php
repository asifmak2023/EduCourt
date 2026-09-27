<?php

namespace App\Models;

use App\Enums\EquipmentMovementType;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class SportEquipmentMovement extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity;

    protected $fillable = [
        'institution_id', 'campus_id', 'sport_equipment_id', 'type', 'quantity',
        'balance_after', 'issued_to', 'movement_date', 'remarks', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'type' => EquipmentMovementType::class,
            'quantity' => 'decimal:2',
            'balance_after' => 'decimal:2',
            'movement_date' => 'date',
        ];
    }

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(SportEquipment::class, 'sport_equipment_id');
    }

    public function issuedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_to');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
