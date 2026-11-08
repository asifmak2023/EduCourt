<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\WhatsAppConnectionMode;
use App\Enums\WhatsAppManagedBy;
use App\Enums\WhatsAppMessageCategory;
use App\Models\Campus;
use App\Models\Institution;
use App\Models\IntegrationPolicy;
use App\Models\MetaAppConnection;
use App\Models\WhatsAppConsent;
use App\Models\WhatsAppSender;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WhatsAppSchemaTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    protected function setUp(): void
    {
        parent::setUp();

        $this->institution = Institution::create(['name' => 'Test Trust', 'code' => 'TT']);
        $this->campus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus A', 'code' => 'A', 'type' => CampusType::School->value,
        ]);
    }

    private function makeSender(array $attributes = []): WhatsAppSender
    {
        return WhatsAppSender::create(array_merge([
            'owner_institution_id' => $this->institution->id,
            'managed_by' => WhatsAppManagedBy::Institution->value,
            'label' => 'Main',
            'connection_mode' => WhatsAppConnectionMode::InstitutionManaged->value,
            'phone_number_id' => '123456',
            'business_account_id' => 'WABA1',
            'access_token' => 'secret-token',
        ], $attributes));
    }

    public function test_sender_secrets_are_encrypted_at_rest_and_hidden(): void
    {
        $sender = $this->makeSender();

        $raw = \DB::table('whatsapp_senders')->where('id', $sender->id)->value('access_token');

        $this->assertNotSame('secret-token', $raw);
        $this->assertArrayNotHasKey('access_token', $sender->fresh()->toArray());
    }

    public function test_meta_app_secrets_are_encrypted_and_hidden(): void
    {
        $app = MetaAppConnection::create([
            'app_key' => 'default',
            'app_id' => 'app-1',
            'app_secret' => 'very-secret',
            'verify_token' => 'verify-me',
        ]);

        $raw = \DB::table('meta_app_connections')->where('id', $app->id)->value('app_secret');

        $this->assertNotSame('very-secret', $raw);
        $this->assertArrayNotHasKey('app_secret', $app->fresh()->toArray());
        $this->assertArrayNotHasKey('verify_token', $app->fresh()->toArray());
    }

    public function test_soft_deleted_sender_frees_the_unique_key(): void
    {
        $sender = $this->makeSender();
        $sender->delete();

        $replacement = $this->makeSender(['label' => 'Replacement']);

        $this->assertNotSame($sender->id, $replacement->id);
        $this->assertDatabaseCount('whatsapp_senders', 2);
    }

    public function test_duplicate_active_sender_is_rejected(): void
    {
        $this->makeSender();

        $this->expectException(QueryException::class);

        $this->makeSender(['label' => 'Duplicate']);
    }

    public function test_restored_sender_collides_safely_when_an_active_row_exists(): void
    {
        $sender = $this->makeSender();
        $sender->delete();

        $this->makeSender(['label' => 'Replacement']);

        $this->expectException(QueryException::class);
        $sender->restore();
    }

    public function test_policy_sender_assignment_is_nullable_and_explicit(): void
    {
        $policy = IntegrationPolicy::create([
            'institution_id' => $this->institution->id,
        ])->refresh();

        $this->assertNull($policy->whatsapp_sender_id);
        $this->assertTrue($policy->whatsapp_allowed);
        $this->assertFalse($policy->whatsapp_self_service);
        $this->assertSame('Asia/Karachi', $policy->quota_timezone);
    }

    public function test_consent_requires_opt_in_for_the_same_category_and_business(): void
    {
        $phone = '923001234567';

        WhatsAppConsent::create([
            'institution_id' => $this->institution->id,
            'business_account_id' => 'WABA1',
            'phone' => $phone,
            'message_category' => 'utility',
            'status' => 'opted_in',
        ]);

        $this->assertTrue(WhatsAppConsent::allowsDelivery(
            $this->institution->id, 'WABA1', $phone, WhatsAppMessageCategory::Utility
        ));

        $this->assertFalse(WhatsAppConsent::allowsDelivery(
            $this->institution->id, 'WABA1', $phone, WhatsAppMessageCategory::Marketing
        ));

        $this->assertFalse(WhatsAppConsent::allowsDelivery(
            $this->institution->id, 'WABA2', $phone, WhatsAppMessageCategory::Utility
        ));
    }

    public function test_pending_consent_blocks_delivery(): void
    {
        WhatsAppConsent::create([
            'institution_id' => $this->institution->id,
            'business_account_id' => 'WABA1',
            'phone' => '923001234567',
            'message_category' => 'utility',
            'status' => 'pending',
        ]);

        $this->assertFalse(WhatsAppConsent::allowsDelivery(
            $this->institution->id, 'WABA1', '923001234567', WhatsAppMessageCategory::Utility
        ));
    }

    public function test_sender_ownership_and_managed_by_are_independent(): void
    {
        $sender = $this->makeSender([
            'owner_institution_id' => $this->institution->id,
            'managed_by' => WhatsAppManagedBy::Platform->value,
        ]);

        $this->assertFalse($sender->isPlatformOwned());
        $this->assertSame(WhatsAppManagedBy::Platform, $sender->managed_by);
    }

    public function test_platform_owned_sender_is_shared(): void
    {
        $sender = $this->makeSender([
            'owner_institution_id' => null,
            'managed_by' => WhatsAppManagedBy::Platform->value,
            'phone_number_id' => '999',
        ]);

        $this->assertTrue($sender->isPlatformOwned());
    }
}
