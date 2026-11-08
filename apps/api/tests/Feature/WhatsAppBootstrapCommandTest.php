<?php

namespace Tests\Feature;

use App\Enums\WhatsAppConsentStatus;
use App\Models\Institution;
use App\Models\IntegrationPolicy;
use App\Models\MetaAppConnection;
use App\Models\WhatsAppConsent;
use App\Models\WhatsAppSender;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WhatsAppBootstrapCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'reminders.whatsapp.token' => 'legacy-token',
            'reminders.whatsapp.phone_number_id' => '123456',
            'reminders.whatsapp.default_country_code' => '92',
        ]);
    }

    public function test_bootstrap_creates_the_meta_app_and_platform_sender(): void
    {
        $this->artisan('whatsapp:bootstrap')->assertSuccessful();

        $this->assertDatabaseHas('meta_app_connections', ['app_key' => 'default']);
        $this->assertDatabaseHas('whatsapp_senders', [
            'owner_institution_id' => null,
            'phone_number_id' => '123456',
            'managed_by' => 'platform',
            'connection_mode' => 'platform_managed',
        ]);

        $sender = WhatsAppSender::query()->where('phone_number_id', '123456')->first();
        $this->assertSame('legacy-token', $sender->access_token);
    }

    public function test_bootstrap_is_idempotent(): void
    {
        $this->artisan('whatsapp:bootstrap')->assertSuccessful();
        $this->artisan('whatsapp:bootstrap')->assertSuccessful();

        $this->assertSame(1, MetaAppConnection::query()->where('app_key', 'default')->count());
        $this->assertSame(1, WhatsAppSender::query()->where('phone_number_id', '123456')->count());
    }

    public function test_bootstrap_does_not_assign_any_institution_by_default(): void
    {
        $institution = Institution::create(['name' => 'School A', 'code' => 'SA']);

        $this->artisan('whatsapp:bootstrap')->assertSuccessful();

        $this->assertSame(0, IntegrationPolicy::query()->where('institution_id', $institution->id)->count());
    }

    public function test_bootstrap_assigns_only_an_explicit_institution(): void
    {
        $institution = Institution::create(['name' => 'School A', 'code' => 'SA']);

        $this->artisan('whatsapp:bootstrap', ['--institution' => (string) $institution->id])
            ->assertSuccessful();

        $policy = IntegrationPolicy::query()->where('institution_id', $institution->id)->first();

        $this->assertNotNull($policy);
        $this->assertTrue($policy->whatsapp_allowed);
        $this->assertNotNull($policy->whatsapp_sender_id);
    }

    public function test_bootstrap_fails_without_credentials(): void
    {
        config([
            'reminders.whatsapp.token' => null,
            'reminders.whatsapp.phone_number_id' => null,
        ]);

        $this->artisan('whatsapp:bootstrap')->assertFailed();

        $this->assertSame(0, WhatsAppSender::query()->count());
    }

    public function test_consent_import_marks_only_listed_numbers(): void
    {
        $institution = Institution::create(['name' => 'School A', 'code' => 'SA']);

        IntegrationPolicy::create([
            'institution_id' => $institution->id,
            'whatsapp_allowed' => true,
        ]);

        $file = tempnam(sys_get_temp_dir(), 'consent').'.csv';
        file_put_contents($file, "phone\n+92 300 1234567\n03001112223\nnot-a-number\n");

        $this->artisan('whatsapp:import-consent', [
            'institution' => (string) $institution->id,
            '--business-account' => 'WABA-A',
            '--file' => $file,
        ])->assertSuccessful();

        $imported = WhatsAppConsent::query()
            ->where('institution_id', $institution->id)
            ->where('status', 'opted_in')
            ->pluck('phone')
            ->all();

        sort($imported);

        $this->assertSame(['923001112223', '923001234567'], $imported);

        @unlink($file);
    }

    public function test_consent_import_leaves_unlisted_numbers_pending(): void
    {
        $institution = Institution::create(['name' => 'School A', 'code' => 'SA']);

        IntegrationPolicy::create([
            'institution_id' => $institution->id,
            'whatsapp_allowed' => true,
        ]);

        WhatsAppConsent::create([
            'institution_id' => $institution->id,
            'business_account_id' => 'WABA-A',
            'phone' => '923009999999',
            'message_category' => 'utility',
            'status' => 'pending',
            'source' => 'import',
        ]);

        $file = tempnam(sys_get_temp_dir(), 'consent').'.csv';
        file_put_contents($file, "phone\n+92 300 1234567\n");

        $this->artisan('whatsapp:import-consent', [
            'institution' => (string) $institution->id,
            '--business-account' => 'WABA-A',
            '--file' => $file,
        ])->assertSuccessful();

        $status = WhatsAppConsent::query()
            ->where('phone', '923009999999')
            ->first()
            ->status;

        $this->assertSame(WhatsAppConsentStatus::Pending, $status);

        @unlink($file);
    }

    public function test_consent_import_requires_a_file(): void
    {
        $institution = Institution::create(['name' => 'School A', 'code' => 'SA']);

        $this->artisan('whatsapp:import-consent', [
            'institution' => (string) $institution->id,
            '--business-account' => 'WABA-A',
        ])->assertFailed();
    }
}
