<?php

namespace App\Models;

use App\Enums\AssetStatus;
use App\Enums\DepreciationMethod;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Asset extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'chart_of_account_id', 'code', 'name',
        'category', 'serial_no', 'location', 'custodian', 'acquisition_date',
        'acquisition_cost', 'salvage_value', 'useful_life_months',
        'depreciation_method', 'status', 'disposed_on', 'disposal_proceeds', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'acquisition_date' => 'date',
            'acquisition_cost' => 'decimal:2',
            'salvage_value' => 'decimal:2',
            'useful_life_months' => 'integer',
            'depreciation_method' => DepreciationMethod::class,
            'status' => AssetStatus::class,
            'disposed_on' => 'date',
            'disposal_proceeds' => 'decimal:2',
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

    public function chartOfAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class);
    }

    public function depreciableBase(): float
    {
        return max(0.0, (float) $this->acquisition_cost - (float) $this->salvage_value);
    }

    public function monthlyDepreciation(): float
    {
        if ($this->depreciation_method !== DepreciationMethod::StraightLine) {
            return 0.0;
        }

        $life = (int) $this->useful_life_months;

        if ($life <= 0) {
            return 0.0;
        }

        return round($this->depreciableBase() / $life, 2);
    }

    public function accumulatedDepreciation(?CarbonInterface $asOf = null): float
    {
        if ($this->depreciation_method !== DepreciationMethod::StraightLine) {
            return 0.0;
        }

        $life = (int) $this->useful_life_months;

        if ($life <= 0 || $this->acquisition_date === null) {
            return 0.0;
        }

        $asOf ??= now();
        $months = (int) $this->acquisition_date->diffInMonths($asOf);

        if ($this->acquisition_date->greaterThan($asOf)) {
            return 0.0;
        }

        $months = min($months, $life);

        return round($this->monthlyDepreciation() * $months, 2);
    }

    public function bookValue(?CarbonInterface $asOf = null): float
    {
        if ($this->status !== AssetStatus::Active) {
            return round((float) $this->disposal_proceeds, 2);
        }

        return round((float) $this->acquisition_cost - $this->accumulatedDepreciation($asOf), 2);
    }

    public function isActive(): bool
    {
        return $this->status === AssetStatus::Active;
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
