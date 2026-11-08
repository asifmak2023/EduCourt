<?php

namespace App\Models;

use App\Enums\WhatsAppConsentStatus;
use App\Enums\WhatsAppMessageCategory;
use App\Support\Concerns\BelongsToInstitution;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

/**
 * Guardian WhatsApp consent for one business identity and message category.
 *
 * Absence of evidence is "pending", which blocks proactive messaging. A phone
 * number on file is not consent.
 */
class WhatsAppConsent extends Model
{
    use BelongsToInstitution, HasFactory, LogsActivity;

    protected $table = 'whatsapp_consents';

    protected $fillable = [
        'institution_id', 'business_account_id', 'phone', 'message_category',
        'status', 'source', 'consent_version', 'evidence_ref',
        'opted_in_at', 'opted_out_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => WhatsAppConsentStatus::class,
            'message_category' => WhatsAppMessageCategory::class,
            'opted_in_at' => 'datetime',
            'opted_out_at' => 'datetime',
        ];
    }

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    public static function normalisePhone(string $phone, string $defaultCountryCode = '92'): ?string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if ($digits === '') {
            return null;
        }

        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        } elseif (str_starts_with($digits, '0')) {
            $digits = $defaultCountryCode.substr($digits, 1);
        }

        return strlen($digits) >= 8 && strlen($digits) <= 15 ? $digits : null;
    }

    public static function allowsDelivery(
        int $institutionId,
        string $businessAccountId,
        string $phone,
        WhatsAppMessageCategory $category,
    ): bool {
        $normalised = self::normalisePhone($phone);

        if ($normalised === null) {
            return false;
        }

        return self::query()
            ->where('institution_id', $institutionId)
            ->where('business_account_id', $businessAccountId)
            ->where('phone', $normalised)
            ->where('message_category', $category->value)
            ->where('status', WhatsAppConsentStatus::OptedIn->value)
            ->exists();
    }

    /**
     * Record an opt-out without erasing prior consent history. A subsequent
     * opt-in updates the same row and refreshes opted_in_at.
     */
    public function withdraw(?string $source = null): void
    {
        $this->update([
            'status' => WhatsAppConsentStatus::OptedOut,
            'source' => $source ?? $this->source,
            'opted_out_at' => Carbon::now(),
        ]);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()->logAll()->logOnlyDirty();
    }
}
