<?php

namespace App\Models;

use App\Enums\ItAssetStatus;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class ItAsset extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'name', 'asset_tag', 'category', 'brand',
        'model_no', 'serial_no', 'purchase_date', 'cost', 'warranty_until',
        'status', 'assigned_to', 'assigned_on', 'location', 'vendor', 'notes',
    ];

    protected $attributes = [
        'category' => 'laptop',
        'cost' => 0,
        'status' => 'available',
    ];

    protected function casts(): array
    {
        return [
            'status' => ItAssetStatus::class,
            'purchase_date' => 'date',
            'warranty_until' => 'date',
            'assigned_on' => 'date',
            'cost' => 'decimal:2',
        ];
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(ItAssetAssignment::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(HelpdeskTicket::class);
    }

    public function isUnderWarranty(): bool
    {
        return $this->warranty_until !== null && $this->warranty_until->isFuture();
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
