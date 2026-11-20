<?php

namespace App\Models;

use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Institution extends Model
{
    use BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'name', 'code', 'legal_name', 'email', 'phone', 'website', 'address', 'currency',
        'is_active', 'settings',
        'plan', 'status', 'trial_ends_at', 'max_campuses',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'settings' => 'array',
            'trial_ends_at' => 'datetime',
            'max_campuses' => 'integer',
        ];
    }

    public function hasFinancialPostings(): bool
    {
        return DB::table('fee_vouchers')->where('institution_id', $this->id)->exists()
            || DB::table('fee_charges')->where('institution_id', $this->id)->exists()
            || DB::table('fee_payments')->where('institution_id', $this->id)->exists()
            || DB::table('fee_receipts')->where('institution_id', $this->id)->exists()
            || DB::table('payment_intents')->where('institution_id', $this->id)->exists();
    }

    public function campuses(): HasMany
    {
        return $this->hasMany(Campus::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
