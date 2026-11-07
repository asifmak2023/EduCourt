<?php

namespace App\Services\WhatsApp;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Thin client for the Meta WhatsApp Cloud API.
 *
 * Sends plain-text messages through the configured business phone number. Phone
 * numbers are normalised to E.164 digits (the format the Cloud API expects, with
 * no leading "+") before delivery.
 */
class WhatsAppClient
{
    public function __construct(
        private readonly ?string $token,
        private readonly ?string $phoneNumberId,
        private readonly string $baseUrl,
        private readonly int $timeout,
        private readonly string $defaultCountryCode,
    ) {}

    public static function fromConfig(): self
    {
        $config = (array) config('reminders.whatsapp', []);

        return new self(
            token: self::stringOrNull($config['token'] ?? null),
            phoneNumberId: self::stringOrNull($config['phone_number_id'] ?? null),
            baseUrl: rtrim((string) ($config['base_url'] ?? 'https://graph.facebook.com/v21.0'), '/'),
            timeout: (int) ($config['timeout'] ?? 15),
            defaultCountryCode: preg_replace('/\D+/', '', (string) ($config['default_country_code'] ?? '')) ?? '',
        );
    }

    /**
     * Whether the client has enough configuration to attempt delivery.
     */
    public function configured(): bool
    {
        return $this->token !== null && $this->phoneNumberId !== null;
    }

    /**
     * Send a plain-text WhatsApp message. Returns true only on a 2xx response.
     */
    public function sendText(string $recipient, string $body): bool
    {
        if (! $this->configured()) {
            Log::warning('WhatsApp delivery skipped: gateway is not configured.', [
                'recipient' => $recipient,
            ]);

            return false;
        }

        $to = $this->normalizePhone($recipient);

        if ($to === null) {
            Log::warning('WhatsApp delivery skipped: recipient phone number is invalid.', [
                'recipient' => $recipient,
            ]);

            return false;
        }

        try {
            $response = Http::withToken($this->token)
                ->timeout($this->timeout)
                ->acceptJson()
                ->post($this->endpoint(), [
                    'messaging_product' => 'whatsapp',
                    'recipient_type' => 'individual',
                    'to' => $to,
                    'type' => 'text',
                    'text' => [
                        'preview_url' => false,
                        'body' => $body,
                    ],
                ]);
        } catch (ConnectionException $exception) {
            Log::warning('WhatsApp delivery failed: connection error.', [
                'recipient' => $to,
                'error' => $exception->getMessage(),
            ]);

            return false;
        }

        if ($response->failed()) {
            Log::warning('WhatsApp delivery failed: API rejected the message.', [
                'recipient' => $to,
                'status' => $response->status(),
                'error' => $response->json('error.message'),
            ]);

            return false;
        }

        return true;
    }

    /**
     * Normalise a free-form phone number to E.164 digits without a leading "+".
     *
     * Handles leading "+", the "00" international prefix and national trunk
     * zeros by prefixing the configured default country code. Returns null when
     * the result is not a plausible international number.
     */
    public function normalizePhone(string $phone): ?string
    {
        $trimmed = trim($phone);

        if ($trimmed === '') {
            return null;
        }

        $hasPlus = str_starts_with($trimmed, '+');
        $digits = preg_replace('/\D+/', '', $trimmed) ?? '';

        if ($digits === '') {
            return null;
        }

        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        } elseif (! $hasPlus) {
            if (str_starts_with($digits, '0')) {
                $digits = $this->defaultCountryCode === ''
                    ? $digits
                    : $this->defaultCountryCode.substr($digits, 1);
            } elseif ($this->defaultCountryCode !== '' && ! str_starts_with($digits, $this->defaultCountryCode)) {
                $digits = $this->defaultCountryCode.$digits;
            }
        }

        if (strlen($digits) < 8 || strlen($digits) > 15) {
            return null;
        }

        return $digits;
    }

    private function endpoint(): string
    {
        return "{$this->baseUrl}/{$this->phoneNumberId}/messages";
    }

    private static function stringOrNull(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : $value;
    }
}
