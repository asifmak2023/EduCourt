<?php

namespace App\Models;

use App\Enums\SalaryIncrementType;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Reusable salary template for a designation, modelled after fee structures.
 *
 * A designation's template is versioned: revising a structure creates a new
 * row with an incremented `version` and marks the previous row as superseded
 * (`superseded_by_id`), so full history is preserved. Only the latest version
 * of each designation is "current" (see the `current` scope).
 *
 * Applying a template copies its basic salary and component lines into each
 * staff member's effective-dated StaffSalary, so the payroll engine (which
 * reads StaffSalary) keeps working unchanged.
 */
class SalaryStructure extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'designation_id', 'name', 'version',
        'superseded_by_id', 'basic_salary', 'currency', 'effective_from',
        'effective_to', 'is_active', 'increment_type', 'increment_value',
        'increment_every_months', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'basic_salary' => 'decimal:2',
            'effective_from' => 'date',
            'effective_to' => 'date',
            'is_active' => 'boolean',
            'increment_type' => SalaryIncrementType::class,
            'increment_value' => 'decimal:2',
            'increment_every_months' => 'integer',
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

    public function designation(): BelongsTo
    {
        return $this->belongsTo(Designation::class);
    }

    public function supersededBy(): BelongsTo
    {
        return $this->belongsTo(self::class, 'superseded_by_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(SalaryStructureItem::class)->orderBy('sort_order');
    }

    public function staffSalaries(): HasMany
    {
        return $this->hasMany(StaffSalary::class);
    }

    /**
     * Structures that have not been superseded by a newer revision.
     */
    public function scopeCurrent(Builder $query): Builder
    {
        return $query->whereNull('superseded_by_id');
    }

    public function isCurrent(): bool
    {
        return $this->superseded_by_id === null;
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
