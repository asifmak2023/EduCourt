<?php

namespace App\Services\WhatsApp;

use App\Enums\WhatsAppConnectionMode;
use App\Enums\WhatsAppTokenExpiryMode;
use App\Models\IntegrationPolicy;
use App\Models\WhatsAppSender;

/**
 * Resolves the WhatsApp sender for an institution, fail-closed.
 *
 * Deliberately stateless: nothing is cached between calls and the tenant is
 * never inferred from ambient request state. A long-running queue worker can
 * therefore never reuse another institution's credentials.
 *
 * Precedence:
 *  1. integration_policies.whatsapp_allowed (platform kill-switch)
 *  2. integration_policies.whatsapp_sender_id (explicit assignment)
 *  3. whatsapp_senders.connection_mode (identity/management path)
 *  4. whatsapp_senders.is_active (operational toggle)
 */
class SenderResolver
{
    public function resolve(int $institutionId): ResolvedSender
    {
        $policy = IntegrationPolicy::query()
            ->where('institution_id', $institutionId)
            ->first();

        if ($policy === null) {
            return ResolvedSender::notReady('no_policy_configured');
        }

        if (! $policy->whatsapp_allowed) {
            return ResolvedSender::notReady('platform_kill_switch');
        }

        if ($policy->whatsapp_sender_id === null) {
            return ResolvedSender::notReady('no_sender_assigned');
        }

        $sender = WhatsAppSender::query()->find($policy->whatsapp_sender_id);

        if ($sender === null) {
            return ResolvedSender::notReady('sender_not_found');
        }

        if ($sender->connection_mode === WhatsAppConnectionMode::Disabled) {
            return ResolvedSender::notReady('sender_disabled', $sender);
        }

        if (! $sender->is_active) {
            return ResolvedSender::notReady('sender_inactive', $sender);
        }

        if ($sender->connection_mode === WhatsAppConnectionMode::InstitutionManaged
            && $sender->owner_institution_id !== $institutionId) {
            return ResolvedSender::notReady('sender_not_owned', $sender);
        }

        if (! $sender->hasCredentials()) {
            return ResolvedSender::notReady('configuration_required', $sender);
        }

        if ($sender->tokenExpired()) {
            return ResolvedSender::notReady('token_expired', $sender);
        }

        return ResolvedSender::ready($sender, $this->warnings($sender));
    }

    /**
     * Non-fatal advisories surfaced as a UI banner. An unknown expiry does not
     * block sending; it means we were never told when the token dies.
     *
     * @return array<int, string>
     */
    private function warnings(WhatsAppSender $sender): array
    {
        if ($sender->token_expiry_mode === WhatsAppTokenExpiryMode::Unknown) {
            return ['token_expiry_unknown'];
        }

        $expiresAt = $sender->token_expires_at;

        if ($sender->token_expiry_mode === WhatsAppTokenExpiryMode::Known && $expiresAt !== null) {
            $days = (int) now()->diffInDays($expiresAt, false);

            if ($days <= 7) {
                return ['token_expiring_soon'];
            }
        }

        return [];
    }
}
