<?php

namespace App\Models;

use App\Enums\RoleName;
use App\Notifications\ResetPasswordNotification;
use App\Support\Concerns\BelongsToCampus;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable implements MustVerifyEmail
{
    use BelongsToCampus, BelongsToInstitution, HasApiTokens, HasFactory, HasRoles, LogsActivity, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'institution_id',
        'campus_id',
        'phone',
        'employee_code',
        'job_title',
        'is_active',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'two_factor_confirmed_at',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
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

    public function scopeAssignments(): HasMany
    {
        return $this->hasMany(ScopeAssignment::class);
    }

    public function student(): HasOne
    {
        return $this->hasOne(Student::class);
    }

    public function isPlatformAdmin(): bool
    {
        return $this->hasRole(RoleName::PlatformAdmin->value);
    }

    public function hasTwoFactorEnabled(): bool
    {
        return $this->two_factor_confirmed_at !== null;
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token, $this->getEmailForPasswordReset()));
    }

    public function requiresTwoFactor(): bool
    {
        foreach (RoleName::twoFactorRequired() as $role) {
            if ($this->hasRole($role->value)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Campus ids this user may act within. Empty array means "all campuses".
     *
     * @return array<int, int>
     */
    public function allowedCampusIds(): array
    {
        if ($this->isPlatformAdmin()) {
            return [];
        }

        $ids = ScopeAssignment::withoutGlobalScopes()
            ->where('user_id', $this->id)
            ->where('is_active', true)
            ->whereNotNull('campus_id')
            ->pluck('campus_id')
            ->all();

        if ($this->campus_id !== null) {
            $ids[] = $this->campus_id;
        }

        return array_values(array_unique(array_map('intval', $ids)));
    }

    public function canAccessCampus(int $campusId): bool
    {
        if ($this->isPlatformAdmin()) {
            return true;
        }

        $allowed = $this->allowedCampusIds();

        return $allowed !== [] && in_array($campusId, $allowed, true);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'email', 'campus_id', 'institution_id', 'is_active', 'job_title'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }
}
