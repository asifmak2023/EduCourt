<?php

namespace App\Models;

use App\Enums\ChangeRisk;
use App\Enums\ChangeStatus;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class ItChangeRequest extends Model
{
    use BelongsToCampus, BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'campus_id', 'title', 'description', 'type', 'risk',
        'status', 'requested_by', 'approved_by', 'planned_on', 'implemented_on',
        'rollback_plan', 'decision_notes', 'decided_at',
    ];

    protected $attributes = [
        'type' => 'software',
        'risk' => 'low',
        'status' => 'draft',
    ];

    protected function casts(): array
    {
        return [
            'risk' => ChangeRisk::class,
            'status' => ChangeStatus::class,
            'planned_on' => 'date',
            'implemented_on' => 'date',
            'decided_at' => 'datetime',
        ];
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
