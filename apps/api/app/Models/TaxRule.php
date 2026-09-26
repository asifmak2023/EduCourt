<?php

namespace App\Models;

use App\Enums\TaxAppliesTo;
use App\Enums\TaxType;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class TaxRule extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'tax_account_id', 'name', 'code', 'type',
        'applies_to', 'rate', 'effective_from', 'effective_to', 'is_active', 'description',
    ];

    protected function casts(): array
    {
        return [
            'type' => TaxType::class,
            'applies_to' => TaxAppliesTo::class,
            'rate' => 'decimal:3',
            'effective_from' => 'date',
            'effective_to' => 'date',
            'is_active' => 'boolean',
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

    public function taxAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'tax_account_id');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
