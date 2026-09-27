<?php

namespace App\Models;

use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class ItAssetAssignment extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity;

    protected $fillable = [
        'institution_id', 'campus_id', 'it_asset_id', 'assigned_to', 'assigned_on',
        'returned_on', 'condition', 'notes', 'created_by',
    ];

    protected $attributes = [
        'condition' => 'good',
    ];

    protected function casts(): array
    {
        return [
            'assigned_on' => 'date',
            'returned_on' => 'date',
        ];
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(ItAsset::class, 'it_asset_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
