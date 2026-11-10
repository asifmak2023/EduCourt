<?php

namespace App\Http\Controllers\Api;

use App\Enums\WhatsAppQuotaStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\WhatsAppSenderResource;
use App\Models\Campus;
use App\Models\CampusIntegrationPolicy;
use App\Models\IntegrationPolicy;
use App\Models\IntegrationTemplate;
use App\Models\WhatsAppUsage;
use App\Services\WhatsApp\SenderResolver;
use App\Services\WhatsApp\WhatsAppClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Institution-scoped WhatsApp integration management.
 *
 * Reads are visible to any `integration.view` holder. Writes require
 * `integration.edit` *and* self-service to be enabled, or a platform admin.
 * Institution heads only ever receive `integration.view`, so they are read-only.
 */
class IntegrationController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $institutionId = $this->institutionId($request);
        $policy = $this->policy($institutionId);
        $sender = $policy?->whatsappSender;

        return response()->json([
            'data' => [
                'institution_id' => $institutionId,
                'enabled' => (bool) ($policy?->whatsapp_allowed ?? false),
                'self_service' => (bool) ($policy?->whatsapp_self_service ?? false),
                'monthly_message_limit' => $policy?->monthly_message_limit,
                'warn_at_percent' => $policy?->warn_at_percent,
                'quota_timezone' => $policy?->quota_timezone,
                'sender' => $sender !== null ? new WhatsAppSenderResource($sender) : null,
                'resolution' => $this->resolutionState($institutionId),
                'templates' => IntegrationTemplate::query()
                    ->where('institution_id', $institutionId)
                    ->orderBy('purpose')
                    ->get()
                    ->map(fn (IntegrationTemplate $template) => [
                        'id' => $template->id,
                        'purpose' => $template->purpose,
                        'name' => $template->name,
                        'language' => $template->language,
                        'approval_status' => $template->approval_status,
                        'parameters' => $template->parameters,
                    ])
                    ->values(),
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $institutionId = $this->institutionId($request);
        $this->authoriseWrite($request, $institutionId);

        $policy = $this->policy($institutionId);

        if ($policy === null) {
            abort(422, 'No WhatsApp policy exists for this institution yet.');
        }

        $data = $request->validate([
            'monthly_message_limit' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'warn_at_percent' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'quota_timezone' => ['sometimes', 'timezone'],
        ]);

        $policy->update($data);

        return $this->show($request);
    }

    /**
     * Validate credentials only. Does not prove deliverability.
     */
    public function verify(Request $request): JsonResponse
    {
        $institutionId = $this->institutionId($request);
        $this->authoriseWrite($request, $institutionId);

        $resolved = (new SenderResolver)->resolve($institutionId);

        if (! $resolved->ready) {
            return response()->json([
                'ok' => false,
                'reason' => $resolved->failureReason,
            ], 422);
        }

        $client = new WhatsAppClient(
            $resolved,
            rtrim((string) config('reminders.whatsapp.base_url', 'https://graph.facebook.com/v21.0'), '/'),
            (int) config('reminders.whatsapp.timeout', 15),
        );

        $ok = $client->verify();

        $resolved->sender?->forceFill([
            'last_verified_at' => $ok ? now() : $resolved->sender->last_verified_at,
            'last_error' => $ok ? null : 'Credential verification failed.',
        ])->save();

        return response()->json(['ok' => $ok]);
    }

    /**
     * Send a real message to prove deliverability. Separate from verify.
     */
    public function testSend(Request $request): JsonResponse
    {
        $institutionId = $this->institutionId($request);
        $this->authoriseWrite($request, $institutionId);

        $data = $request->validate([
            'to' => ['required', 'string', 'max:32'],
        ]);

        $resolved = (new SenderResolver)->resolve($institutionId);

        if (! $resolved->ready) {
            return response()->json([
                'ok' => false,
                'reason' => $resolved->failureReason,
            ], 422);
        }

        $client = new WhatsAppClient(
            $resolved,
            rtrim((string) config('reminders.whatsapp.base_url', 'https://graph.facebook.com/v21.0'), '/'),
            (int) config('reminders.whatsapp.timeout', 15),
        );

        $recipient = $client->normalizePhone($data['to']);

        if ($recipient === null) {
            return response()->json(['ok' => false, 'reason' => 'invalid_recipient'], 422);
        }

        $result = $client->sendText(
            $recipient,
            'EduCourt test message. Your WhatsApp integration is working.',
        );

        return response()->json([
            'ok' => $result['ok'],
            'reason' => $result['error'],
            'message_id' => $result['message_id'],
        ], $result['ok'] ? 200 : 422);
    }

    /**
     * Per-campus WhatsApp numbers and policies for the current institution.
     *
     * Read-only for institution users: the platform assigns campus senders and
     * toggles self-service. Shows which number each campus sends from so an
     * institution head can see the whole picture without being able to change
     * credentials.
     */
    public function campuses(Request $request): JsonResponse
    {
        $institutionId = $this->institutionId($request);

        $campuses = Campus::query()
            ->where('institution_id', $institutionId)
            ->orderBy('name')
            ->get();

        $policies = CampusIntegrationPolicy::query()
            ->with('whatsappSender')
            ->where('institution_id', $institutionId)
            ->get()
            ->keyBy('campus_id');

        $resolver = new SenderResolver;

        $data = $campuses->map(function (Campus $campus) use ($policies, $resolver, $institutionId): array {
            /** @var CampusIntegrationPolicy|null $policy */
            $policy = $policies->get($campus->id);
            $resolved = $resolver->resolveForCampus($institutionId, (int) $campus->id);
            $sender = $resolved->sender;

            return [
                'campus_id' => $campus->id,
                'campus_name' => $campus->name,
                'whatsapp_enabled' => (bool) ($policy?->whatsapp_enabled ?? true),
                'whatsapp_self_service' => (bool) ($policy?->whatsapp_self_service ?? false),
                'whatsapp_sender_id' => $policy?->whatsapp_sender_id,
                'monthly_message_limit' => $policy?->monthly_message_limit,
                'uses_own_number' => $sender !== null && $sender->owner_campus_id === $campus->id,
                'ready' => $resolved->ready,
                'reason' => $resolved->failureReason,
                'sender' => $sender !== null ? [
                    'id' => $sender->id,
                    'label' => $sender->label,
                    'display_phone_number' => $sender->display_phone_number,
                    'phone_number_id' => $sender->phone_number_id,
                    'is_active' => (bool) $sender->is_active,
                ] : null,
            ];
        })->values();

        return response()->json(['data' => $data]);
    }

    public function usage(Request $request): JsonResponse
    {
        $institutionId = $this->institutionId($request);
        $policy = $this->policy($institutionId);
        $costs = (string) $request->query('include', '');

        $period = Carbon::now($policy?->quota_timezone ?? config('app.timezone'))->format('Y-m');

        $query = WhatsAppUsage::query()
            ->where('institution_id', $institutionId)
            ->where('period', $period);

        $summary = [
            'period' => $period,
            'reserved' => (clone $query)->where('quota_status', WhatsAppQuotaStatus::Reserved->value)->count(),
            'consumed' => (clone $query)->where('quota_status', WhatsAppQuotaStatus::Consumed->value)->count(),
            'released' => (clone $query)->where('quota_status', WhatsAppQuotaStatus::Released->value)->count(),
            'monthly_message_limit' => $policy?->monthly_message_limit,
        ];

        if ($costs === 'cost') {
            $summary['estimated_cost'] = (string) (clone $query)->sum('estimated_cost');
            $summary['billed_cost'] = (string) (clone $query)->sum('billed_cost');
        }

        return response()->json(['data' => $summary]);
    }

    private function policy(int $institutionId): ?IntegrationPolicy
    {
        return IntegrationPolicy::query()
            ->with('whatsappSender')
            ->where('institution_id', $institutionId)
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function resolutionState(int $institutionId): array
    {
        $resolved = (new SenderResolver)->resolve($institutionId);

        return [
            'ready' => $resolved->ready,
            'reason' => $resolved->failureReason,
            'warnings' => $resolved->warnings,
        ];
    }

    private function institutionId(Request $request): int
    {
        $user = $request->user();

        if ($user->isPlatformAdmin()) {
            return (int) $request->integer('institution_id', $user->institution_id ?? 0);
        }

        if ($user->institution_id === null) {
            abort(403, 'Your account is not linked to an institution.');
        }

        return (int) $user->institution_id;
    }

    /**
     * Self-service gate: a platform admin may always write. An institution user
     * may write only when self-service is enabled and the assigned sender is
     * institution-managed, so platform-managed credentials stay platform-only.
     */
    private function authoriseWrite(Request $request, int $institutionId): void
    {
        $user = $request->user();

        if ($user->isPlatformAdmin()) {
            return;
        }

        $policy = $this->policy($institutionId);

        if ($policy === null || ! $policy->whatsapp_self_service) {
            abort(403, 'WhatsApp self-service is disabled for this institution.');
        }

        $sender = $policy->whatsappSender;

        if ($sender !== null && $sender->managed_by?->value === 'platform') {
            abort(403, 'This sender is managed by the platform.');
        }
    }
}
