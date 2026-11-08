<?php

namespace App\Services\WhatsApp;

use App\Enums\WhatsAppDeliveryStatus;
use App\Models\FeeReminder;
use App\Models\MetaAppConnection;
use App\Models\WhatsAppMessageEvent;
use App\Models\WhatsAppSender;
use App\Models\WhatsAppUsage;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Verifies and persists Meta WhatsApp webhooks.
 *
 * Verification: GET handshake against the app's verify_token. POST bodies are
 * authenticated with X-Hub-Signature-256 (HMAC-SHA256 of the raw body), the
 * same primitive used by PaymentService.
 *
 * Persistence is durable before acknowledgement. A valid signature with an
 * unknown phone_number_id is acknowledged after logging an alert; a database
 * failure returns 5xx so Meta retries rather than losing the event.
 */
class WhatsAppWebhookService
{
    public function verify(Request $request, string $appKey): string
    {
        $app = MetaAppConnection::query()
            ->where('app_key', $appKey)
            ->where('is_active', true)
            ->first();

        if ($app === null) {
            abort(403, 'Unknown WhatsApp app.');
        }

        $mode = (string) $request->query('hub_mode', $request->query('hub.mode'));
        $token = (string) $request->query('hub_verify_token', $request->query('hub.verify_token'));
        $challenge = (string) $request->query('hub_challenge', $request->query('hub.challenge'));

        if ($mode !== 'subscribe' || $app->verify_token === null || ! hash_equals((string) $app->verify_token, $token)) {
            abort(403, 'Invalid verify token.');
        }

        return $challenge;
    }

    /**
     * @return array{processed: int, unmatched: int}
     */
    public function handle(Request $request, string $appKey): array
    {
        $app = MetaAppConnection::query()
            ->where('app_key', $appKey)
            ->where('is_active', true)
            ->first();

        if ($app === null || $app->app_secret === null) {
            abort(403, 'Unknown WhatsApp app.');
        }

        $raw = $request->getContent();
        $this->assertSignature($raw, $request->header('X-Hub-Signature-256'), (string) $app->app_secret);

        /** @var array<string, mixed> $payload */
        $payload = json_decode($raw, true) ?? [];

        try {
            return DB::transaction(fn () => $this->persist($payload));
        } catch (HttpException $exception) {
            throw $exception;
        } catch (\Throwable $exception) {
            Log::error('WhatsApp webhook persistence failed.', [
                'app_key' => $appKey,
                'error' => $exception->getMessage(),
            ]);

            // Retryable: never acknowledge an event that was not stored.
            abort(500, 'Unable to persist WhatsApp webhook.');
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{processed: int, unmatched: int}
     */
    private function persist(array $payload): array
    {
        $processed = 0;
        $unmatched = 0;

        foreach (($payload['entry'] ?? []) as $entry) {
            foreach (($entry['changes'] ?? []) as $change) {
                $value = $change['value'] ?? [];
                $phoneNumberId = (string) ($value['metadata']['phone_number_id'] ?? '');
                $sender = $this->senderFor($phoneNumberId);

                if ($sender === null) {
                    $unmatched++;
                    Log::warning('WhatsApp webhook for an unknown sender.', [
                        'phone_number_id' => $phoneNumberId,
                    ]);

                    continue;
                }

                foreach (($value['messages'] ?? []) as $message) {
                    $this->recordInbound($sender, $message);
                    $processed++;
                }

                foreach (($value['statuses'] ?? []) as $status) {
                    $this->recordStatus($sender, $status);
                    $processed++;
                }
            }
        }

        return ['processed' => $processed, 'unmatched' => $unmatched];
    }

    /**
     * @param  array<string, mixed>  $message
     */
    private function recordInbound(WhatsAppSender $sender, array $message): void
    {
        $messageId = (string) ($message['id'] ?? '');
        $from = (string) ($message['from'] ?? '');
        $occurredAt = isset($message['timestamp'])
            ? Carbon::createFromTimestamp((int) $message['timestamp'])
            : now();

        if ($messageId === '' || $from === '') {
            return;
        }

        WhatsAppMessageEvent::query()->firstOrCreate(
            [
                'integration_id' => $sender->id,
                'provider_message_id' => $messageId,
                'event' => 'message',
                'occurred_at' => $occurredAt,
            ],
            [
                'institution_id' => $sender->owner_institution_id,
                'contact_wa_id' => $from,
                'direction' => 'inbound',
                'event_meta' => ['type' => $message['type'] ?? null],
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $status
     */
    private function recordStatus(WhatsAppSender $sender, array $status): void
    {
        $messageId = (string) ($status['id'] ?? '');
        $state = strtolower((string) ($status['status'] ?? ''));
        $occurredAt = isset($status['timestamp'])
            ? Carbon::createFromTimestamp((int) $status['timestamp'])
            : now();

        if ($messageId === '' || $state === '') {
            return;
        }

        WhatsAppMessageEvent::query()->firstOrCreate(
            [
                'integration_id' => $sender->id,
                'provider_message_id' => $messageId,
                'event' => $state,
                'occurred_at' => $occurredAt,
            ],
            [
                'institution_id' => $sender->owner_institution_id,
                'contact_wa_id' => (string) ($status['recipient_id'] ?? ''),
                'direction' => 'outbound',
                'event_meta' => [
                    'conversation' => $status['conversation']['id'] ?? null,
                    'error' => $status['errors'][0]['title'] ?? null,
                ],
            ],
        );

        $this->applyStatus($messageId, $state, $occurredAt);
    }

    /**
     * Apply a provider status to the usage row with a monotonic transition, so
     * an out-of-order (or duplicate) receipt never downgrades a later state.
     */
    private function applyStatus(string $providerMessageId, string $state, Carbon $occurredAt): void
    {
        $usage = WhatsAppUsage::query()
            ->withoutGlobalScopes()
            ->where('provider_message_id', $providerMessageId)
            ->first();

        if ($usage === null) {
            return;
        }

        $target = $this->mapStatus($state);

        if ($target === null) {
            return;
        }

        $current = $usage->delivery_status;

        // Failed is terminal and applies from any live state; otherwise only
        // forward transitions are allowed so a late "sent" cannot overwrite a
        // "read".
        if ($current instanceof WhatsAppDeliveryStatus) {
            if ($current === $target) {
                return;
            }

            if ($target !== WhatsAppDeliveryStatus::Failed && $current->rank() > $target->rank()) {
                return;
            }
        }

        $attributes = ['delivery_status' => $target];

        if ($target === WhatsAppDeliveryStatus::Delivered) {
            $attributes['delivered_at'] = $occurredAt;
        } elseif ($target === WhatsAppDeliveryStatus::Read) {
            $attributes['read_at'] = $occurredAt;
            $attributes['delivered_at'] = $usage->delivered_at ?? $occurredAt;
        } elseif ($target === WhatsAppDeliveryStatus::Failed) {
            $attributes['failed_at'] = $occurredAt;
        }

        $usage->forceFill($attributes)->save();

        $this->syncRecord($usage, $target);
    }

    private function mapStatus(string $state): ?WhatsAppDeliveryStatus
    {
        return match ($state) {
            'sent' => WhatsAppDeliveryStatus::Sent,
            'delivered' => WhatsAppDeliveryStatus::Delivered,
            'read' => WhatsAppDeliveryStatus::Read,
            'failed' => WhatsAppDeliveryStatus::Failed,
            default => null,
        };
    }

    private function syncRecord(WhatsAppUsage $usage, WhatsAppDeliveryStatus $status): void
    {
        if ($usage->reminder_id !== null) {
            FeeReminder::query()
                ->withoutGlobalScopes()
                ->whereKey($usage->reminder_id)
                ->update(['provider_status' => $status->value]);
        }
    }

    private function senderFor(string $phoneNumberId): ?WhatsAppSender
    {
        if ($phoneNumberId === '') {
            return null;
        }

        return WhatsAppSender::query()
            ->where('phone_number_id', $phoneNumberId)
            ->whereNull('deleted_at')
            ->first();
    }

    private function assertSignature(string $raw, ?string $header, string $secret): void
    {
        if ($header === null || ! str_starts_with($header, 'sha256=')) {
            abort(401, 'Missing WhatsApp signature.');
        }

        $provided = substr($header, 7);
        $expected = hash_hmac('sha256', $raw, $secret);

        if (! hash_equals($expected, $provided)) {
            abort(401, 'Invalid WhatsApp signature.');
        }
    }
}
