<?php

namespace App\Models;

use App\Enums\ConcessionType;
use App\Enums\DiscountType;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class ConcessionPolicy extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'academic_year_id', 'class_room_id',
        'name', 'code', 'type', 'discount_type', 'value', 'max_amount',
        'criteria', 'priority', 'is_stackable', 'requires_approval',
        'is_active', 'description',
    ];

    protected function casts(): array
    {
        return [
            'type' => ConcessionType::class,
            'discount_type' => DiscountType::class,
            'value' => 'decimal:2',
            'max_amount' => 'decimal:2',
            'criteria' => 'array',
            'priority' => 'integer',
            'is_stackable' => 'boolean',
            'requires_approval' => 'boolean',
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

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function classRoom(): BelongsTo
    {
        return $this->belongsTo(ClassRoom::class);
    }

    public function concessions(): HasMany
    {
        return $this->hasMany(Concession::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
