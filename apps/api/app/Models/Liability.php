<?php

namespace App\Models;

use App\Enums\LiabilityStatus;
use App\Enums\LiabilityType;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Liability extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'chart_of_account_id', 'code', 'name',
        'type', 'lender', 'principal_amount', 'interest_rate', 'starts_on',
        'matures_on', 'installment_amount', 'outstanding_amount', 'status',
        'settled_on', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'type' => LiabilityType::class,
            'principal_amount' => 'decimal:2',
            'interest_rate' => 'decimal:3',
            'starts_on' => 'date',
            'matures_on' => 'date',
            'installment_amount' => 'decimal:2',
            'outstanding_amount' => 'decimal:2',
            'status' => LiabilityStatus::class,
            'settled_on' => 'date',
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

    public function isActive(): bool
    {
        return $this->status === LiabilityStatus::Active;
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
