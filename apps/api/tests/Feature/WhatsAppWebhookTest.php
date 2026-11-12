<?php

namespace Tests\Feature;

use App\Enums\WhatsAppConnectionMode;
use App\Enums\WhatsAppConsentStatus;
use App\Enums\WhatsAppDeliveryStatus;
use App\Enums\WhatsAppManagedBy;
use App\Enums\WhatsAppMessageCategory;
use App\Enums\WhatsAppQuotaStatus;
use App\Models\Institution;
use App\Models\MetaAppConnection;
use App\Models\WhatsAppConsent;
use App\Models\WhatsAppMessageEvent;
use App\Models\WhatsAppSender;
use App\Models\WhatsAppUsage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WhatsAppWebhookTest extends TestCase
{
    use RefreshDatabase;

    private MetaAppConnection $metaApp;

    private WhatsAppSender $sender;

    private Institution $institution;

    private string $secret = 'app-secret-value';

    protected function setUp(): void
    {
        parent::setUp();

        $this->metaApp = MetaAppConnection::create([
            'app_key' => 'default',
            'app_id' => '1234567890',
            'app_secret' => $this->secret,
            'verify_token' => 'verify-me',
            'is_active' => true,
        ]);

        $this->institution = Institution::create(['name' => 'School A', 'code' => 'SA']);

        $this->sender = WhatsAppSender::create([
            'owner_institution_id' => null,
            'meta_app_connection_id' => $this->metaApp->id,
            'managed_by' => WhatsAppManagedBy::Platform->value,
            'label' => 'Platform number',
            'connection_mode' => WhatsAppConnectionMode::PlatformManaged->value,
            'phone_number_id' => '555',
            'business_account_id' => 'WABA-P',
            'access_token' => 'token',
        ]);
    }

    private function signature(string $body, ?string $secret = null): string
    {
        return 'sha256='.hash_hmac('sha256', $body, $secret ?? $this->secret);
    }

    private function inboundPayload(string $phoneNumberId = '555'): array
    {
        return [
            'object' => 'whatsapp_business_account',
            'entry' => [[
                'id' => 'WABA-P',
                'changes' => [[
                    'field' => 'messages',
                    'value' => [
                        'messaging_product' => 'whatsapp',
                        'metadata' => ['phone_number_id' => $phoneNumberId],
                        'messages' => [[
                            'id' => 'wamid.in1',
                            'from' => '923001234567',
                            'timestamp' => (string) now()->timestamp,
                            'type' => 'text',
                            'text' => ['body' => 'STOP'],
                        ]],
                    ],
                ]],
            ]],
        ];
    }

    private function statusPayload(string $messageId, string $status, string $phoneNumberId = '555'): array
    {
        return [
            'object' => 'whatsapp_business_account',
            'entry' => [[
                'changes' => [[
                    'field' => 'messages',
                    'value' => [
                        'metadata' => ['phone_number_id' => $phoneNumberId],
                        'statuses' => [[
                            'id' => $messageId,
                            'status' => $status,
                            'timestamp' => (string) now()->timestamp,
                            'recipient_id' => '923001234567',
                        ]],
                    ],
                ]],
            ]],
        ];
    }

    private function usage(string $messageId): WhatsAppUsage
    {
        return WhatsAppUsage::create([
            'institution_id' => $this->institution->id,
            'sender_id' => $this->sender->id,
            'delivery_intent_key' => 'reminder:1',
            'attempt_number' => 1,
            'idempotency_key' => 'reminder:1:1',
            'provider_message_id' => $messageId,
            'message_category' => 'utility',
            'quota_status' => WhatsAppQuotaStatus::Consumed,
            'delivery_status' => WhatsAppDeliveryStatus::Submitted,
            'recipient' => '923001234567',
            'period' => now()->format('Y-m'),
        ]);
    }

    public function test_get_handshake_returns_the_challenge_for_the_right_token(): void
    {
        $this->get('/api/v1/webhooks/whatsapp/default?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=abc123')
            ->assertOk()
            ->assertSeeText('abc123');
    }

    public function test_get_handshake_rejects_a_wrong_token(): void
    {
        $this->get('/api/v1/webhooks/whatsapp/default?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=abc123')
            ->assertForbidden();
    }

    public function test_get_handshake_rejects_an_unknown_app(): void
    {
        $this->get('/api/v1/webhooks/whatsapp/missing?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=abc')
            ->assertForbidden();
    }

    public function test_post_with_a_valid_signature_persists_the_event(): void
    {
        $body = json_encode($this->inboundPayload());

        $this->call('POST', '/api/v1/webhooks/whatsapp/default', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_HUB_SIGNATURE_256' => $this->signature($body),
        ], $body)->assertOk();

        $this->assertDatabaseHas('whatsapp_message_events', [
            'integration_id' => $this->sender->id,
            'provider_message_id' => 'wamid.in1',
            'direction' => 'inbound',
            'contact_wa_id' => '923001234567',
        ]);
    }

    public function test_post_without_a_signature_is_rejected(): void
    {
        $body = json_encode($this->inboundPayload());

        $this->call('POST', '/api/v1/webhooks/whatsapp/default', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], $body)->assertStatus(401);

        $this->assertSame(0, WhatsAppMessageEvent::query()->count());
    }

    public function test_post_with_an_invalid_signature_is_rejected(): void
    {
        $body = json_encode($this->inboundPayload());

        $this->call('POST', '/api/v1/webhooks/whatsapp/default', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_HUB_SIGNATURE_256' => $this->signature($body, 'wrong-secret'),
        ], $body)->assertStatus(401);
    }

    public function test_duplicate_deliveries_are_idempotent(): void
    {
        $body = json_encode($this->inboundPayload());
        $headers = [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_HUB_SIGNATURE_256' => $this->signature($body),
        ];

        $this->call('POST', '/api/v1/webhooks/whatsapp/default', [], [], [], $headers, $body)->assertOk();
        $this->call('POST', '/api/v1/webhooks/whatsapp/default', [], [], [], $headers, $body)->assertOk();

        $this->assertSame(1, WhatsAppMessageEvent::query()->count());
    }

    public function test_unknown_phone_number_id_is_acknowledged_and_flagged(): void
    {
        $body = json_encode($this->inboundPayload('unknown-999'));

        $this->call('POST', '/api/v1/webhooks/whatsapp/default', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_HUB_SIGNATURE_256' => $this->signature($body),
        ], $body)
            ->assertOk()
            ->assertJsonPath('unmatched', 1);

        $this->assertSame(0, WhatsAppMessageEvent::query()->count());
    }

    public function test_a_delivery_receipt_advances_usage_status(): void
    {
        $usage = $this->usage('wamid.out1');
        $body = json_encode($this->statusPayload('wamid.out1', 'delivered'));

        $this->call('POST', '/api/v1/webhooks/whatsapp/default', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_HUB_SIGNATURE_256' => $this->signature($body),
        ], $body)->assertOk();

        $this->assertSame(WhatsAppDeliveryStatus::Delivered, $usage->fresh()->delivery_status);
        $this->assertNotNull($usage->fresh()->delivered_at);
    }

    public function test_out_of_order_receipts_never_downgrade_status(): void
    {
        $usage = $this->usage('wamid.out2');
        $usage->forceFill(['delivery_status' => WhatsAppDeliveryStatus::Read])->save();

        $body = json_encode($this->statusPayload('wamid.out2', 'sent'));

        $this->call('POST', '/api/v1/webhooks/whatsapp/default', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_HUB_SIGNATURE_256' => $this->signature($body),
        ], $body)->assertOk();

        $this->assertSame(WhatsAppDeliveryStatus::Read, $usage->fresh()->delivery_status);
    }

    public function test_a_failed_receipt_marks_the_usage_failed(): void
    {
        $usage = $this->usage('wamid.out3');
        $body = json_encode($this->statusPayload('wamid.out3', 'failed'));

        $this->call('POST', '/api/v1/webhooks/whatsapp/default', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_HUB_SIGNATURE_256' => $this->signature($body),
        ], $body)->assertOk();

        $this->assertSame(WhatsAppDeliveryStatus::Failed, $usage->fresh()->delivery_status);
        $this->assertNotNull($usage->fresh()->failed_at);
    }

    public function test_inbound_events_open_the_service_window(): void
    {
        $body = json_encode($this->inboundPayload());

        $this->call('POST', '/api/v1/webhooks/whatsapp/default', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_HUB_SIGNATURE_256' => $this->signature($body),
        ], $body)->assertOk();

        $this->assertTrue(
            WhatsAppMessageEvent::windowOpen($this->sender->id, '923001234567')
        );
    }

    public function test_a_stop_reply_opts_the_contact_out_for_the_sender_waba(): void
    {
        $sender = WhatsAppSender::create([
            'owner_institution_id' => $this->institution->id,
            'meta_app_connection_id' => $this->metaApp->id,
            'managed_by' => WhatsAppManagedBy::Institution->value,
            'label' => 'Institution number',
            'connection_mode' => WhatsAppConnectionMode::InstitutionManaged->value,
            'phone_number_id' => '777',
            'business_account_id' => 'WABA-I',
            'access_token' => 'token',
        ]);

        $consent = WhatsAppConsent::create([
            'institution_id' => $this->institution->id,
            'business_account_id' => 'WABA-I',
            'phone' => '923001234567',
            'message_category' => WhatsAppMessageCategory::Utility->value,
            'status' => WhatsAppConsentStatus::OptedIn,
            'source' => 'portal',
            'opted_in_at' => now(),
        ]);

        $body = json_encode($this->inboundPayload('777'));

        $this->call('POST', '/api/v1/webhooks/whatsapp/default', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_HUB_SIGNATURE_256' => $this->signature($body),
        ], $body)->assertOk();

        $consent->refresh();
        $this->assertSame(WhatsAppConsentStatus::OptedOut, $consent->status);
        $this->assertSame('whatsapp_reply', $consent->source);
        $this->assertNotNull($consent->opted_out_at);
        $this->assertSame($sender->id, $sender->fresh()->id);
    }

    public function test_an_ordinary_reply_does_not_change_consent(): void
    {
        $sender = WhatsAppSender::create([
            'owner_institution_id' => $this->institution->id,
            'meta_app_connection_id' => $this->metaApp->id,
            'managed_by' => WhatsAppManagedBy::Institution->value,
            'label' => 'Institution number',
            'connection_mode' => WhatsAppConnectionMode::InstitutionManaged->value,
            'phone_number_id' => '888',
            'business_account_id' => 'WABA-I',
            'access_token' => 'token',
        ]);

        $consent = WhatsAppConsent::create([
            'institution_id' => $this->institution->id,
            'business_account_id' => 'WABA-I',
            'phone' => '923001234567',
            'message_category' => WhatsAppMessageCategory::Utility->value,
            'status' => WhatsAppConsentStatus::OptedIn,
            'source' => 'portal',
            'opted_in_at' => now(),
        ]);

        $payload = $this->inboundPayload('888');
        $payload['entry'][0]['changes'][0]['value']['messages'][0]['text']['body'] = 'Thank you';
        $body = json_encode($payload);

        $this->call('POST', '/api/v1/webhooks/whatsapp/default', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_HUB_SIGNATURE_256' => $this->signature($body),
        ], $body)->assertOk();

        $this->assertSame(WhatsAppConsentStatus::OptedIn, $consent->fresh()->status);
        $this->assertSame($sender->id, $sender->fresh()->id);
    }
}
