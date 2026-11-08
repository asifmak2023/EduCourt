<?php

namespace App\Services\WhatsApp;

use App\Models\WhatsAppSender;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

/**
 * Token lifecycle for WhatsApp senders.
 *
 * Rotation overwrites the access token and expiry in one place and emits an
 * audit entry that records *that* a rotation happened, never the secret. The
 * model's activity log excludes access_token, so the token never reaches the
 * activity table or application logs.
 */
class SenderTokenService
{
    /**
     * Rotate a sender's token non-destructively.
     *
     * @param  array{access_token: string, token_expiry_mode?: string, token_expires_at?: ?string, actor_id?: ?int}  $data
     */
    public function rotate(WhatsAppSender $sender, array $data): WhatsAppSender
    {
        $mode = $data['token_expiry_mode'] ?? $sender->token_expiry_mode?->value ?? 'unknown';

        $sender->forceFill([
            'access_token' => $data['access_token'],
            'token_expiry_mode' => $mode,
            'token_expires_at' => $data['token_expires_at'] ?? null,
            'last_verified_at' => null,
            'last_error' => null,
        ])->save();

        $this->recordRotation($sender, $data['actor_id'] ?? null, $mode);

        return $sender->refresh();
    }

    /**
     * Senders whose known expiry has passed or is within the warning window.
     *
     * @return Collection<int, WhatsAppSender>
     */
    public function expiring(int $withinDays = 7)
    {
        return WhatsAppSender::query()
            ->whereNull('deleted_at')
            ->where('token_expiry_mode', 'known')
            ->whereNotNull('token_expires_at')
            ->where('token_expires_at', '<=', now()->addDays($withinDays))
            ->orderBy('token_expires_at')
            ->get();
    }

    /**
     * Senders that are active and reachable but whose expiry we were never told.
     *
     * @return Collection<int, WhatsAppSender>
     */
    public function unknownExpiry()
    {
        return WhatsAppSender::query()
            ->whereNull('deleted_at')
            ->where('is_active', true)
            ->where('token_expiry_mode', 'unknown')
            ->get();
    }

    private function recordRotation(WhatsAppSender $sender, ?int $actorId, string $mode): void
    {
        activity('whatsapp-integration')
            ->performedOn($sender)
            ->causedBy($actorId)
            ->withProperties([
                'event' => 'token_rotated',
                'token_expiry_mode' => $mode,
                'token_expires_at' => $sender->token_expires_at?->toIso8601String(),
            ])
            ->log('WhatsApp sender token rotated');

        Log::info('WhatsApp sender token rotated.', [
            'sender_id' => $sender->id,
            'token_expiry_mode' => $mode,
            'actor_id' => $actorId,
        ]);
    }
}
