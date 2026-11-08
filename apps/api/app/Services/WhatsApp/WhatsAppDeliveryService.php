<?php

namespace App\Services\WhatsApp;

use App\Enums\NotificationStatus;
use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Enums\WhatsAppDeliveryStatus;
use App\Enums\WhatsAppMessageCategory;
use App\Enums\WhatsAppQuotaStatus;
use App\Models\AppNotification;
use App\Models\FeeReminder;
use App\Models\IntegrationPolicy;
use App\Models\WhatsAppConsent;
use App\Models\WhatsAppMessageEvent;
use App\Models\WhatsAppRateCard;
use App\Models\WhatsAppUsage;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Orchestrates an outbound WhatsApp delivery.
 *
 * Stages: resolve sender -> consent -> quota reserve -> template/window choice
 * -> submit -> record outcome. Every stage fails closed and records a reason.
 *
 * Delivery is at-least-once with reconciliation, never exactly-once. A network
 * timeout after submission is recorded as submission_unknown and is never
 * retried automatically.
 */
class WhatsAppDeliveryService
{
    public function __construct(
        private readonly SenderResolver $resolver,
        private readonly string $baseUrl,
        private readonly int $timeout,
        private readonly ?TemplateSelector $templates = null,
    ) {}

    public static function make(): self
    {
        return new self(
            new SenderResolver,
            rtrim((string) config('reminders.whatsapp.base_url', 'https://graph.facebook.com/v21.0'), '/'),
            (int) config('reminders.whatsapp.timeout', 15),
            new TemplateSelector,
        );
    }

    /**
     * Deliver a fee reminder over WhatsApp. Returns true when accepted.
     */
    public function sendReminder(FeeReminder $reminder): bool
    {
        if ($reminder->channel !== ReminderChannel::WhatsApp) {
            return false;
        }

        $intentKey = $this->intentKeyForReminder($reminder);

        return $this->deliver(
            institutionId: (int) $reminder->institution_id,
            intentKey: $intentKey,
            recipient: (string) $reminder->recipient_phone,
            body: (string) $reminder->message,
            category: WhatsAppMessageCategory::Utility,
            purpose: 'fee_reminder',
            reminder: $reminder,
            templateContext: $this->reminderTemplateContext($reminder),
        );
    }

    /**
     * Deliver a general notification over WhatsApp.
     */
    public function sendNotification(AppNotification $notification): bool
    {
        if ($notification->channel !== ReminderChannel::WhatsApp) {
            return false;
        }

        $intentKey = sprintf(
            'notification:%d:recipient:%s:whatsapp',
            $notification->id,
            $notification->recipient_phone ?? 'none',
        );

        $body = trim(implode("\n\n", array_filter([
            $notification->title,
            $notification->body,
        ])));

        return $this->deliver(
            institutionId: (int) $notification->institution_id,
            intentKey: $intentKey,
            recipient: (string) $notification->recipient_phone,
            body: $body,
            category: WhatsAppMessageCategory::Utility,
            purpose: 'notification',
            notification: $notification,
            templateContext: $this->notificationTemplateContext($notification),
        );
    }

    private function deliver(
        int $institutionId,
        string $intentKey,
        string $recipient,
        string $body,
        WhatsAppMessageCategory $category,
        string $purpose,
        ?FeeReminder $reminder = null,
        ?AppNotification $notification = null,
        array $templateContext = [],
    ): bool {
        $resolved = $this->resolver->resolve($institutionId);

        if (! $resolved->ready) {
            $this->fail($reminder, $notification, $resolved->failureReason ?? 'not_ready');

            return false;
        }

        $sender = $resolved->sender;
        $client = new WhatsAppClient($resolved, $this->baseUrl, $this->timeout);
        $normalised = $client->normalizePhone($recipient);

        if ($normalised === null) {
            $this->fail($reminder, $notification, 'invalid_recipient');

            return false;
        }

        $businessAccountId = (string) ($sender?->business_account_id ?? '');

        if ($businessAccountId === '' || ! WhatsAppConsent::allowsDelivery($institutionId, $businessAccountId, $normalised, $category)) {
            $this->fail($reminder, $notification, 'no_whatsapp_consent');

            return false;
        }

        $policy = $this->policyFor($institutionId);

        if ($policy !== null && $this->quotaExhausted($policy)) {
            $this->fail($reminder, $notification, 'quota_exceeded');

            return false;
        }

        $usage = $this->reserveQuota($institutionId, $resolved, $intentKey, $normalised, $category, $reminder, $notification);

        if ($usage === null) {
            $this->fail($reminder, $notification, 'quota_exceeded');

            return false;
        }

        $windowOpen = WhatsAppMessageEvent::windowOpen(
            (int) $sender?->id,
            $normalised,
        );

        $result = $windowOpen
            ? $client->sendText($normalised, $body)
            : $this->sendViaTemplate($institutionId, $sender?->id, $normalised, $body, $purpose, $templateContext);

        if ($result['ok']) {
            $usage->update([
                'quota_status' => WhatsAppQuotaStatus::Consumed,
                'delivery_status' => WhatsAppDeliveryStatus::Submitted,
                'provider_message_id' => $result['message_id'],
                'submitted_at' => now(),
            ]);

            if ($reminder !== null) {
                $reminder->forceFill([
                    'provider_message_id' => $result['message_id'],
                    'provider_status' => WhatsAppDeliveryStatus::Submitted->value,
                ])->save();
            }

            if ($notification !== null) {
                $notification->forceFill([
                    'provider_message_id' => $result['message_id'],
                    'provider_status' => WhatsAppDeliveryStatus::Submitted->value,
                ])->save();
            }

            return true;
        }

        if ($result['uncertain']) {
            $usage->update([
                'delivery_status' => WhatsAppDeliveryStatus::SubmissionUnknown,
            ]);

            $this->fail($reminder, $notification, 'submission_unknown');

            return false;
        }

        $usage->update([
            'quota_status' => WhatsAppQuotaStatus::Released,
            'delivery_status' => WhatsAppDeliveryStatus::Failed,
            'failed_at' => now(),
        ]);

        $this->fail($reminder, $notification, $result['error'] ?? 'gateway_rejected');

        return false;
    }

    /**
     * @param  array<int, string>  $parameters
     * @return array{ok: bool, message_id: ?string, error: ?string, uncertain: bool}
     */
    private function sendViaTemplate(
        int $institutionId,
        ?int $senderId,
        string $recipient,
        string $body,
        string $purpose,
        array $templateContext,
    ): array {
        $selector = $this->templates ?? new TemplateSelector;
        $template = $selector->select($institutionId, $senderId, $purpose);

        if ($template === null) {
            return [
                'ok' => false,
                'message_id' => null,
                'error' => 'template_required',
                'uncertain' => false,
            ];
        }

        $resolved = $this->resolver->resolve($institutionId);
        $client = new WhatsAppClient($resolved, $this->baseUrl, $this->timeout);

        return $client->sendTemplate(
            $recipient,
            $template->name,
            $template->language,
            $selector->parameters($template, $templateContext),
        );
    }

    private function policyFor(int $institutionId): ?IntegrationPolicy
    {
        return IntegrationPolicy::query()
            ->where('institution_id', $institutionId)
            ->first();
    }

    /**
     * Period boundaries respect the institution's configured quota timezone.
     */
    private function periodFor(IntegrationPolicy $policy): string
    {
        return Carbon::now($policy->quota_timezone)->format('Y-m');
    }

    private function quotaExhausted(IntegrationPolicy $policy): bool
    {
        if ($policy->monthly_message_limit === null) {
            return false;
        }

        $period = $this->periodFor($policy);

        $used = WhatsAppUsage::query()
            ->where('institution_id', $policy->institution_id)
            ->where('period', $period)
            ->whereIn('quota_status', [
                WhatsAppQuotaStatus::Reserved->value,
                WhatsAppQuotaStatus::Consumed->value,
            ])
            ->count();

        return $used >= $policy->monthly_message_limit;
    }

    /**
     * Reserve quota atomically. Counts once per delivery intent, not per attempt.
     */
    private function reserveQuota(
        int $institutionId,
        ResolvedSender $resolved,
        string $intentKey,
        string $recipient,
        WhatsAppMessageCategory $category,
        ?FeeReminder $reminder,
        ?AppNotification $notification,
    ): ?WhatsAppUsage {
        return DB::transaction(function () use ($institutionId, $resolved, $intentKey, $recipient, $category, $reminder, $notification) {
            $policy = IntegrationPolicy::query()
                ->where('institution_id', $institutionId)
                ->lockForUpdate()
                ->first();

            if ($policy !== null && $policy->monthly_message_limit !== null) {
                $used = WhatsAppUsage::query()
                    ->where('institution_id', $institutionId)
                    ->where('period', $this->periodFor($policy))
                    ->whereIn('quota_status', [
                        WhatsAppQuotaStatus::Reserved->value,
                        WhatsAppQuotaStatus::Consumed->value,
                    ])
                    ->count();

                if ($used >= $policy->monthly_message_limit) {
                    return null;
                }
            }

            $existing = WhatsAppUsage::query()
                ->where('delivery_intent_key', $intentKey)
                ->whereIn('quota_status', [
                    WhatsAppQuotaStatus::Reserved->value,
                    WhatsAppQuotaStatus::Consumed->value,
                ])
                ->first();

            if ($existing !== null) {
                return $existing;
            }

            $attempt = (int) WhatsAppUsage::query()
                ->where('delivery_intent_key', $intentKey)
                ->max('attempt_number') + 1;

            $rateCard = WhatsAppRateCard::for(
                (string) config('reminders.whatsapp.market', 'PK'),
                $category,
            );

            return WhatsAppUsage::create([
                'institution_id' => $institutionId,
                'sender_id' => $resolved->senderId(),
                'reminder_id' => $reminder?->id,
                'notification_id' => $notification?->id,
                'delivery_intent_key' => $intentKey,
                'attempt_number' => max(1, $attempt),
                'idempotency_key' => $intentKey.':'.max(1, $attempt),
                'message_category' => $category,
                'quota_status' => WhatsAppQuotaStatus::Reserved,
                'delivery_status' => WhatsAppDeliveryStatus::Queued,
                'recipient' => $recipient,
                'rate_card_id' => $rateCard?->id,
                'estimated_cost' => $rateCard?->unit_price,
                'estimated_currency' => $rateCard?->currency,
                'period' => $policy !== null ? $this->periodFor($policy) : Carbon::now()->format('Y-m'),
            ]);
        });
    }

    private function fail(?FeeReminder $reminder, ?AppNotification $notification, string $reason): void
    {
        if ($reminder !== null) {
            $reminder->forceFill([
                'status' => ReminderStatus::Failed,
                'sent_at' => null,
                'failure_reason' => $reason,
            ])->save();
        }

        if ($notification !== null) {
            $notification->forceFill([
                'status' => NotificationStatus::Failed,
                'sent_at' => null,
                'failure_reason' => $reason,
            ])->save();
        }

        Log::warning('WhatsApp delivery blocked or failed.', [
            'reason' => $reason,
            'reminder_id' => $reminder?->id,
            'notification_id' => $notification?->id,
        ]);
    }

    private function intentKeyForReminder(FeeReminder $reminder): string
    {
        return sprintf(
            'reminder:%d:guardian:%s:whatsapp',
            $reminder->id,
            $reminder->guardian_id ?? 'student',
        );
    }

    /**
     * @return array<string, string>
     */
    private function reminderTemplateContext(FeeReminder $reminder): array
    {
        return [
            'recipient_name' => (string) $reminder->recipient_name,
            'outstanding' => (string) $reminder->outstanding,
            'oldest_due_date' => (string) ($reminder->oldest_due_date?->toDateString() ?? '-'),
            'days_overdue' => (string) $reminder->days_overdue,
            'message' => (string) $reminder->message,
        ];
    }

    /**
     * @return array<string, string>
     */
    private function notificationTemplateContext(AppNotification $notification): array
    {
        return [
            'recipient_name' => (string) $notification->recipient_name,
            'title' => (string) $notification->title,
            'body' => (string) $notification->body,
        ];
    }
}
