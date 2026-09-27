<?php

namespace App\Models;

use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class SsoProvider extends Model
{
    use BelongsToInstitution, HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'institution_id', 'name', 'provider', 'client_id', 'client_secret',
        'authorize_url', 'token_url', 'userinfo_url', 'logout_url', 'redirect_uri',
        'scopes', 'is_active', 'jit_provisioning', 'default_role',
    ];

    protected $hidden = ['client_secret'];

    protected function casts(): array
    {
        return [
            'client_secret' => 'encrypted',
            'is_active' => 'boolean',
            'jit_provisioning' => 'boolean',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public function identities(): HasMany
    {
        return $this->hasMany(SsoIdentity::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'provider', 'is_active', 'jit_provisioning', 'default_role'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }
}
