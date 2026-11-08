<?php

namespace App\Services\WhatsApp;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Client for the Meta WhatsApp Cloud API.
 *
 * The client is constructed per send from a ResolvedSender. It never reads
 * global configuration and never holds credentials between calls, so a shared
 * queue worker cannot leak one institution's token into another's send.
 */
class WhatsAppClient
{
    public function __construct(
        private readonly ResolvedSender $resolved,
        private readonly string $baseUrl,
        private readonly int $timeout,
    ) {}

    public function resolved(): ResolvedSender
    {
        return $this->resolved;
    }

    /**
     * Normalise a free-form phone number to E.164 digits without a leading "+".
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

        $countryCode = $this->resolved->countryCode();

        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        } elseif (! $hasPlus) {
            if (str_starts_with($digits, '0')) {
                $digits = $countryCode === '' ? $digits : $countryCode.substr($digits, 1);
            } elseif ($countryCode !== '' && ! str_starts_with($digits, $countryCode)) {
                $digits = $countryCode.$digits;
            }
        }

        if (strlen($digits) < 8 || strlen($digits) > 15) {
            return null;
        }

        return $digits;
    }

    /**
     * Send a plain-text message. Used only inside an open 24-hour window.
     *
     * @return array{ok: bool, message_id: ?string, error: ?string, uncertain: bool}
     */
    public function sendText(string $recipient, string $body): array
    {
        return $this->post([
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $recipient,
            'type' => 'text',
            'text' => ['preview_url' => false, 'body' => $body],
        ]);
    }

    /**
     * Send an approved template message with ordered body parameters.
     *
     * @param  array<int, string>  $parameters
     * @return array{ok: bool, message_id: ?string, error: ?string, uncertain: bool}
     */
    public function sendTemplate(
        string $recipient,
        string $templateName,
        string $language,
        array $parameters = [],
    ): array {
        $components = [];

        if ($parameters !== []) {
            $components[] = [
                'type' => 'body',
                'parameters' => array_map(
                    fn (string $value) => ['type' => 'text', 'text' => $value],
                    array_values($parameters),
                ),
            ];
        }

        return $this->post([
            'messaging_product' => 'whatsapp',
            'recipient_type' => 'individual',
            'to' => $recipient,
            'type' => 'template',
            'template' => [
                'name' => $templateName,
                'language' => ['code' => $language],
                'components' => $components,
            ],
        ]);
    }

    /**
     * Validate credentials without sending a message (non-destructive check).
     */
    public function verify(): bool
    {
        $sender = $this->resolved->sender;

        if ($sender === null || $sender->phone_number_id === null) {
            return false;
        }

        try {
            $response = Http::withToken((string) $this->resolved->token())
                ->timeout($this->timeout)
                ->acceptJson()
                ->get("{$this->baseUrl}/{$sender->phone_number_id}");
        } catch (ConnectionException|Throwable) {
            return false;
        }

        return $response->successful();
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{ok: bool, message_id: ?string, error: ?string, uncertain: bool}
     */
    private function post(array $payload): array
    {
        if (! $this->resolved->ready) {
            return ['ok' => false, 'message_id' => null, 'error' => $this->resolved->failureReason, 'uncertain' => false];
        }

        $to = $this->normalizePhone((string) $payload['to']);
        $payload['to'] = $to;

        if ($to === null) {
            return ['ok' => false, 'message_id' => null, 'error' => 'invalid_recipient', 'uncertain' => false];
        }

        try {
            $response = Http::withToken((string) $this->resolved->token())
                ->timeout($this->timeout)
                ->acceptJson()
                ->post($this->endpoint(), $payload);
        } catch (ConnectionException $exception) {
            // The request may have been written before the timeout. Never retry
            // blindly; the caller marks the intent submission_unknown.
            Log::warning('WhatsApp delivery outcome unknown: connection error.', [
                'sender_id' => $this->resolved->senderId(),
                'error' => $exception->getMessage(),
            ]);

            return ['ok' => false, 'message_id' => null, 'error' => 'connection_error', 'uncertain' => true];
        } catch (Throwable $exception) {
            Log::warning('WhatsApp delivery failed: unexpected error.', [
                'sender_id' => $this->resolved->senderId(),
                'error' => $exception->getMessage(),
            ]);

            return ['ok' => false, 'message_id' => null, 'error' => 'unexpected_error', 'uncertain' => true];
        }

        if ($response->failed()) {
            $code = (string) ($response->json('error.code') ?? '');
            Log::warning('WhatsApp delivery rejected by API.', [
                'sender_id' => $this->resolved->senderId(),
                'status' => $response->status(),
                'code' => $code,
            ]);

            return [
                'ok' => false,
                'message_id' => null,
                'error' => $this->mapError($code, $response->json('error.message')),
                'uncertain' => false,
            ];
        }

        return [
            'ok' => true,
            'message_id' => $response->json('messages.0.id'),
            'error' => null,
            'uncertain' => false,
        ];
    }

    private function endpoint(): string
    {
        return "{$this->baseUrl}/{$this->resolved->phoneNumberId()}/messages";
    }

    private function mapError(string $code, ?string $message): string
    {
        return match ($code) {
            '131047' => 'reengagement_required',
            '131026' => 'recipient_undeliverable',
            '132000' => 'template_parameter_mismatch',
            '132001' => 'template_not_found',
            '132005', '132007' => 'template_paused_or_disabled',
            '190' => 'invalid_token',
            default => $message !== null && $message !== '' ? $message : ('api_error_'.$code),
        };
    }
}
