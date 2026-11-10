<?php

namespace App\Services\WhatsApp;

use App\Enums\WhatsAppConnectionMode;
use App\Enums\WhatsAppTokenExpiryMode;
use App\Models\CampusIntegrationPolicy;
use App\Models\IntegrationPolicy;
use App\Models\WhatsAppSender;

/**
 * Resolves the WhatsApp sender for an institution or a campus, fail-closed.
 *
 * Deliberately stateless: nothing is cached between calls and the tenant is
 * never inferred from ambient request state. A long-running queue worker can
 * therefore never reuse another institution's credentials.
 *
 * Institution resolution precedence:
 *  1. integration_policies.whatsapp_allowed (platform kill-switch)
 *  2. integration_policies.whatsapp_sender_id (explicit assignment)
 *  3. whatsapp_senders.connection_mode (identity/management path)
 *  4. whatsapp_senders.is_active (operational toggle)
 *
 * Campus resolution adds a campus policy layer before the institution fallback:
 *  1. institution kill-switch (whatsapp_allowed)
 *  2. campus policy whatsapp_enabled
 *  3. campus policy whatsapp_sender_id (a campus-owned sender)
 *  4. institution policy whatsapp_sender_id (explicit institution fallback)
 *  5. otherwise fail closed
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

        return $this->evaluateSender($sender, $institutionId, null);
    }

    /**
     * Resolve the sender to use for a campus-scoped send. Falls back to the
     * institution sender only when the campus has no usable sender of its own.
     */
    public function resolveForCampus(int $institutionId, int $campusId): ResolvedSender
    {
        $institutionPolicy = IntegrationPolicy::query()
            ->where('institution_id', $institutionId)
            ->first();

        if ($institutionPolicy === null) {
            return ResolvedSender::notReady('no_policy_configured');
        }

        if (! $institutionPolicy->whatsapp_allowed) {
            return ResolvedSender::notReady('platform_kill_switch');
        }

        $campusPolicy = CampusIntegrationPolicy::query()
            ->where('institution_id', $institutionId)
            ->where('campus_id', $campusId)
            ->first();

        if ($campusPolicy !== null && ! $campusPolicy->whatsapp_enabled) {
            return ResolvedSender::notReady('campus_disabled');
        }

        if ($campusPolicy?->whatsapp_sender_id !== null) {
            $campusSender = WhatsAppSender::query()->find($campusPolicy->whatsapp_sender_id);

            if ($campusSender !== null) {
                $resolved = $this->evaluateSender($campusSender, $institutionId, $campusId);

                if ($resolved->ready) {
                    return $resolved;
                }

                // A campus sender exists but is not usable. Fall through to the
                // institution sender only when one is explicitly assigned;
                // never silently borrow another campus's number.
                if ($institutionPolicy->whatsapp_sender_id === null) {
                    return $resolved;
                }
            }
        }

        if ($institutionPolicy->whatsapp_sender_id === null) {
            return ResolvedSender::notReady('no_sender_assigned');
        }

        $institutionSender = WhatsAppSender::query()->find($institutionPolicy->whatsapp_sender_id);

        return $this->evaluateSender($institutionSender, $institutionId, $campusId);
    }

    /**
     * Validate a sender against the tenant. When a campus id is supplied the
     * sender must either belong to that campus, belong to the institution, or
     * be a platform-owned shared sender.
     */
    private function evaluateSender(?WhatsAppSender $sender, int $institutionId, ?int $campusId): ResolvedSender
    {
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

        if ($sender->owner_institution_id !== null && $sender->owner_institution_id !== $institutionId) {
            return ResolvedSender::notReady('sender_not_owned', $sender);
        }

        if ($sender->owner_campus_id !== null && $campusId !== null && $sender->owner_campus_id !== $campusId) {
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
