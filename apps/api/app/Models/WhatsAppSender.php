<?php

namespace App\Models;

use App\Enums\WhatsAppConnectionMode;
use App\Enums\WhatsAppManagedBy;
use App\Enums\WhatsAppTokenExpiryMode;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * A WhatsApp business sender (phone number identity).
 *
 * Three concepts are deliberately separate:
 *  - ownership: owner_institution_id (null = platform-owned shared sender)
 *  - credential management: managed_by
 *  - assignment: IntegrationPolicy::whatsapp_sender_id
 *
 * A sender is never used implicitly; an institution must be assigned to it.
 */
class WhatsAppSender extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'whatsapp_senders';

    protected $fillable = [
        'owner_institution_id', 'meta_app_connection_id', 'managed_by', 'label',
        'connection_mode', 'phone_number_id', 'business_account_id',
        'display_phone_number', 'access_token', 'token_expiry_mode',
        'token_expires_at', 'default_country_code', 'is_active',
        'last_verified_at', 'last_error',
    ];

    protected $hidden = ['access_token'];

    protected function casts(): array
    {
        return [
            'managed_by' => WhatsAppManagedBy::class,
            'connection_mode' => WhatsAppConnectionMode::class,
            'token_expiry_mode' => WhatsAppTokenExpiryMode::class,
            'access_token' => 'encrypted',
            'token_expires_at' => 'datetime',
            'last_verified_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function ownerInstitution(): BelongsTo
    {
        return $this->belongsTo(Institution::class, 'owner_institution_id');
    }

    public function metaAppConnection(): BelongsTo
    {
        return $this->belongsTo(MetaAppConnection::class);
    }

    public function usage(): HasMany
    {
        return $this->hasMany(WhatsAppUsage::class, 'sender_id');
    }

    public function templates(): HasMany
    {
        return $this->hasMany(IntegrationTemplate::class, 'sender_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(WhatsAppMessageEvent::class, 'integration_id');
    }

    public function isPlatformOwned(): bool
    {
        return $this->owner_institution_id === null;
    }

    /**
     * Whether the sender has the credentials needed to reach the Cloud API.
     */
    public function hasCredentials(): bool
    {
        return $this->access_token !== null && $this->phone_number_id !== null;
    }

    public function tokenExpired(): bool
    {
        return $this->token_expiry_mode === WhatsAppTokenExpiryMode::Known
            && $this->token_expires_at !== null
            && $this->token_expires_at->isPast();
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'owner_institution_id', 'meta_app_connection_id', 'managed_by',
                'label', 'connection_mode', 'phone_number_id',
                'business_account_id', 'token_expiry_mode', 'default_country_code',
                'is_active',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }
}
