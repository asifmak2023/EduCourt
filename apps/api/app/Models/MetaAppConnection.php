<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Meta application identity used to sign and verify WhatsApp webhooks.
 *
 * Application credentials only: business senders live in WhatsAppSender.
 */
class MetaAppConnection extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'app_key', 'app_id', 'app_secret', 'verify_token', 'is_active',
    ];

    protected $hidden = ['app_secret', 'verify_token'];

    protected function casts(): array
    {
        return [
            'app_secret' => 'encrypted',
            'verify_token' => 'encrypted',
            'is_active' => 'boolean',
        ];
    }

    public function senders(): HasMany
    {
        return $this->hasMany(WhatsAppSender::class);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['app_key', 'app_id', 'is_active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }
}
