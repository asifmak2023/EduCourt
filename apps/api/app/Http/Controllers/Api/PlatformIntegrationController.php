<?php

namespace App\Http\Controllers\Api;

use App\Enums\WhatsAppConnectionMode;
use App\Enums\WhatsAppManagedBy;
use App\Enums\WhatsAppTokenExpiryMode;
use App\Http\Controllers\Controller;
use App\Http\Resources\WhatsAppSenderResource;
use App\Models\Institution;
use App\Models\IntegrationPolicy;
use App\Models\MetaAppConnection;
use App\Models\WhatsAppRateCard;
use App\Models\WhatsAppSender;
use App\Services\WhatsApp\ResolvedSender;
use App\Services\WhatsApp\SenderTokenService;
use App\Services\WhatsApp\WhatsAppClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

/**
 * Platform-scoped WhatsApp administration.
 *
 * A platform admin assigns senders to institutions explicitly. Assignment is
 * never implicit: a sender exists but does nothing until an institution's
 * policy points at it.
 */
class PlatformIntegrationController extends Controller
{
    public function senders(Request $request): AnonymousResourceCollection
    {
        $senders = WhatsAppSender::query()
            ->when($request->filled('institution_id'), fn ($query) => $query
                ->where('owner_institution_id', $request->integer('institution_id')))
            ->orderBy('label')
            ->paginate($request->integer('per_page', 50));

        return WhatsAppSenderResource::collection($senders);
    }

    public function storeSender(Request $request): JsonResponse
    {
        $data = $this->validateSender($request);

        $sender = WhatsAppSender::create($data);

        return (new WhatsAppSenderResource($sender))->response()->setStatusCode(201);
    }

    public function showSender(WhatsAppSender $sender): WhatsAppSenderResource
    {
        return new WhatsAppSenderResource($sender);
    }

    public function updateSender(Request $request, WhatsAppSender $sender): WhatsAppSenderResource
    {
        $data = $this->validateSender($request, $sender);

        if (array_key_exists('access_token', $data) && $data['access_token'] === null) {
            unset($data['access_token']);
        }

        $sender->update($data);

        return new WhatsAppSenderResource($sender->refresh());
    }

    public function rotateToken(Request $request, WhatsAppSender $sender, SenderTokenService $tokens): JsonResponse
    {
        $data = $request->validate([
            'access_token' => ['required', 'string', 'max:4000'],
            'token_expiry_mode' => ['sometimes', Rule::enum(WhatsAppTokenExpiryMode::class)],
            'token_expires_at' => ['nullable', 'date'],
        ]);

        $requiresExpiry = ($data['token_expiry_mode'] ?? null) === WhatsAppTokenExpiryMode::Known->value;

        if ($requiresExpiry && empty($data['token_expires_at'])) {
            return response()->json([
                'message' => 'A known expiry requires token_expires_at.',
            ], 422);
        }

        $tokens->rotate($sender, [
            'access_token' => $data['access_token'],
            'token_expiry_mode' => $data['token_expiry_mode'] ?? null,
            'token_expires_at' => $data['token_expires_at'] ?? null,
            'actor_id' => $request->user()?->id,
        ]);

        return response()->json(['data' => new WhatsAppSenderResource($sender->refresh())]);
    }

    public function verifySender(WhatsAppSender $sender): JsonResponse
    {
        $resolved = $this->resolveSender($sender);

        if (! $resolved->ready) {
            return response()->json(['ok' => false, 'reason' => $resolved->failureReason], 422);
        }

        $ok = $this->client($resolved)->verify();

        $sender->forceFill([
            'last_verified_at' => $ok ? now() : $sender->last_verified_at,
            'last_error' => $ok ? null : 'Credential verification failed.',
        ])->save();

        return response()->json(['ok' => $ok]);
    }

    public function testSender(Request $request, WhatsAppSender $sender): JsonResponse
    {
        $data = $request->validate(['to' => ['required', 'string', 'max:32']]);

        $resolved = $this->resolveSender($sender);

        if (! $resolved->ready) {
            return response()->json(['ok' => false, 'reason' => $resolved->failureReason], 422);
        }

        $client = $this->client($resolved);
        $recipient = $client->normalizePhone($data['to']);

        if ($recipient === null) {
            return response()->json(['ok' => false, 'reason' => 'invalid_recipient'], 422);
        }

        $result = $client->sendText($recipient, 'EduCourt test message from the platform console.');

        return response()->json($result, $result['ok'] ? 200 : 422);
    }

    public function policy(Institution $institution): JsonResponse
    {
        return response()->json([
            'data' => $this->policyPayload($this->policyFor($institution)),
        ]);
    }

    public function updatePolicy(Request $request, Institution $institution): JsonResponse
    {
        $data = $request->validate([
            'whatsapp_allowed' => ['sometimes', 'boolean'],
            'whatsapp_self_service' => ['sometimes', 'boolean'],
            'whatsapp_sender_id' => [
                'nullable', 'integer',
                Rule::exists('whatsapp_senders', 'id')->whereNull('deleted_at'),
            ],
            'monthly_message_limit' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'warn_at_percent' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'quota_timezone' => ['sometimes', 'timezone'],
        ]);

        $policy = IntegrationPolicy::updateOrCreate(
            ['institution_id' => $institution->id],
            $data,
        );

        return response()->json(['data' => $this->policyPayload($policy->refresh())]);
    }

    public function metaApps(Request $request): JsonResponse
    {
        $apps = MetaAppConnection::query()
            ->orderBy('app_key')
            ->get()
            ->map(fn (MetaAppConnection $app) => [
                'id' => $app->id,
                'app_key' => $app->app_key,
                'app_id' => $app->app_id,
                'is_active' => (bool) $app->is_active,
                'has_app_secret' => $app->app_secret !== null,
                'has_verify_token' => $app->verify_token !== null,
                'created_at' => $app->created_at,
            ]);

        return response()->json(['data' => $apps]);
    }

    public function rateCards(Request $request): JsonResponse
    {
        $cards = WhatsAppRateCard::query()
            ->orderByDesc('effective_from')
            ->get();

        return response()->json(['data' => $cards]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validateSender(Request $request, ?WhatsAppSender $sender = null): array
    {
        $creating = $sender === null;

        return $request->validate([
            'owner_institution_id' => [
                'nullable', 'integer',
                Rule::exists('institutions', 'id')->whereNull('deleted_at'),
            ],
            'meta_app_connection_id' => [
                'nullable', 'integer',
                Rule::exists('meta_app_connections', 'id'),
            ],
            'managed_by' => ['sometimes', Rule::enum(WhatsAppManagedBy::class)],
            'label' => ['required', 'string', 'max:100'],
            'connection_mode' => ['required', Rule::enum(WhatsAppConnectionMode::class)],
            'phone_number_id' => ['nullable', 'string', 'max:64'],
            'business_account_id' => ['nullable', 'string', 'max:64'],
            'display_phone_number' => ['nullable', 'string', 'max:32'],
            'access_token' => [$creating ? 'nullable' : 'nullable', 'string', 'max:4000'],
            'token_expiry_mode' => ['sometimes', Rule::enum(WhatsAppTokenExpiryMode::class)],
            'token_expires_at' => [
                Rule::requiredIf(fn () => $request->input('token_expiry_mode') === WhatsAppTokenExpiryMode::Known->value),
                'nullable', 'date',
            ],
            'default_country_code' => ['sometimes', 'string', 'max:4'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }

    private function policyFor(Institution $institution): ?IntegrationPolicy
    {
        return IntegrationPolicy::query()
            ->where('institution_id', $institution->id)
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function policyPayload(?IntegrationPolicy $policy): array
    {
        return [
            'institution_id' => $policy?->institution_id,
            'whatsapp_allowed' => (bool) ($policy?->whatsapp_allowed ?? true),
            'whatsapp_self_service' => (bool) ($policy?->whatsapp_self_service ?? false),
            'whatsapp_sender_id' => $policy?->whatsapp_sender_id,
            'monthly_message_limit' => $policy?->monthly_message_limit,
            'warn_at_percent' => $policy?->warn_at_percent,
            'quota_timezone' => $policy?->quota_timezone,
        ];
    }

    private function resolveSender(WhatsAppSender $sender): ResolvedSender
    {
        if ($sender->access_token === null || $sender->phone_number_id === null) {
            return ResolvedSender::notReady('configuration_required', $sender);
        }

        return ResolvedSender::ready($sender);
    }

    private function client(ResolvedSender $resolved): WhatsAppClient
    {
        return new WhatsAppClient(
            $resolved,
            rtrim((string) config('reminders.whatsapp.base_url', 'https://graph.facebook.com/v21.0'), '/'),
            (int) config('reminders.whatsapp.timeout', 15),
        );
    }
}
