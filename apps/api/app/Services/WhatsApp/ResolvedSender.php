<?php

namespace App\Services\WhatsApp;

use App\Models\WhatsAppSender;

/**
 * Outcome of resolving which WhatsApp sender an institution may use.
 *
 * This is a result object rather than a nullable config so callers must deal
 * with the failure reason explicitly. There is no implicit fallback.
 */
final class ResolvedSender
{
    /**
     * @param  array<int, string>  $warnings
     */
    public function __construct(
        public readonly bool $ready,
        public readonly ?WhatsAppSender $sender,
        public readonly ?string $failureReason = null,
        public readonly array $warnings = [],
    ) {}

    /**
     * @param  array<int, string>  $warnings
     */
    public static function ready(WhatsAppSender $sender, array $warnings = []): self
    {
        return new self(true, $sender, null, $warnings);
    }

    /**
     * @param  array<int, string>  $warnings
     */
    public static function notReady(string $reason, ?WhatsAppSender $sender = null, array $warnings = []): self
    {
        return new self(false, $sender, $reason, $warnings);
    }

    public function token(): ?string
    {
        return $this->sender?->access_token;
    }

    public function phoneNumberId(): ?string
    {
        return $this->sender?->phone_number_id;
    }

    public function businessAccountId(): ?string
    {
        return $this->sender?->business_account_id;
    }

    public function countryCode(): string
    {
        return $this->sender?->default_country_code ?? '92';
    }

    public function senderId(): ?int
    {
        return $this->sender?->id;
    }
}
