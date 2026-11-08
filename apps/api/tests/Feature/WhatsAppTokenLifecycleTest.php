<?php

namespace Tests\Feature;

use App\Enums\WhatsAppConnectionMode;
use App\Enums\WhatsAppManagedBy;
use App\Enums\WhatsAppTokenExpiryMode;
use App\Models\Institution;
use App\Models\IntegrationPolicy;
use App\Models\WhatsAppSender;
use App\Services\WhatsApp\SenderResolver;
use App\Services\WhatsApp\SenderTokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class WhatsAppTokenLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private function sender(array $attributes = []): WhatsAppSender
    {
        return WhatsAppSender::create(array_merge([
            'owner_institution_id' => null,
            'managed_by' => WhatsAppManagedBy::Platform->value,
            'label' => 'Platform sender',
            'connection_mode' => WhatsAppConnectionMode::PlatformManaged->value,
            'phone_number_id' => '100',
            'business_account_id' => 'WABA-P',
            'access_token' => 'token-old',
            'token_expiry_mode' => WhatsAppTokenExpiryMode::Unknown->value,
        ], $attributes));
    }

    private function resolveFor(WhatsAppSender $sender)
    {
        $institution = Institution::create(['name' => 'School A', 'code' => 'SA']);
        IntegrationPolicy::create([
            'institution_id' => $institution->id,
            'whatsapp_allowed' => true,
            'whatsapp_sender_id' => $sender->id,
        ]);

        return (new SenderResolver)->resolve($institution->id);
    }

    public function test_a_known_expired_token_makes_the_sender_not_ready(): void
    {
        $sender = $this->sender([
            'token_expiry_mode' => WhatsAppTokenExpiryMode::Known->value,
            'token_expires_at' => now()->subDay(),
        ]);

        $resolved = $this->resolveFor($sender);

        $this->assertFalse($resolved->ready);
        $this->assertSame('token_expired', $resolved->failureReason);
    }

    public function test_unknown_expiry_is_ready_with_a_warning(): void
    {
        $sender = $this->sender(['token_expiry_mode' => WhatsAppTokenExpiryMode::Unknown->value]);

        $resolved = $this->resolveFor($sender);

        $this->assertTrue($resolved->ready);
        $this->assertContains('token_expiry_unknown', $resolved->warnings);
    }

    public function test_a_token_expiring_soon_is_ready_with_a_warning(): void
    {
        $sender = $this->sender([
            'token_expiry_mode' => WhatsAppTokenExpiryMode::Known->value,
            'token_expires_at' => now()->addDays(3),
        ]);

        $resolved = $this->resolveFor($sender);

        $this->assertTrue($resolved->ready);
        $this->assertContains('token_expiring_soon', $resolved->warnings);
    }

    public function test_a_token_with_no_expiry_is_ready_without_warnings(): void
    {
        $sender = $this->sender(['token_expiry_mode' => WhatsAppTokenExpiryMode::Never->value]);

        $resolved = $this->resolveFor($sender);

        $this->assertTrue($resolved->ready);
        $this->assertSame([], $resolved->warnings);
    }

    public function test_rotation_replaces_the_token_and_records_an_audit_entry_without_the_secret(): void
    {
        $sender = $this->sender();

        $rotated = (new SenderTokenService)->rotate($sender, [
            'access_token' => 'token-new-secret-value',
            'token_expiry_mode' => WhatsAppTokenExpiryMode::Known->value,
            'token_expires_at' => now()->addDays(30)->toDateTimeString(),
            'actor_id' => null,
        ]);

        $this->assertSame('token-new-secret-value', $rotated->access_token);
        $this->assertNull($rotated->last_verified_at);

        $activity = DB::table('activity_log')
            ->where('subject_type', WhatsAppSender::class)
            ->where('subject_id', $sender->id)
            ->where('log_name', 'whatsapp-integration')
            ->get();

        $this->assertGreaterThanOrEqual(1, $activity->count());

        foreach ($activity as $row) {
            $this->assertStringNotContainsString('token-new-secret-value', (string) $row->properties);
            $this->assertStringNotContainsString('token-old', (string) $row->properties);
        }
    }

    public function test_rotation_does_not_persist_the_token_in_the_activity_log_for_the_model(): void
    {
        $sender = $this->sender();

        $sender->forceFill(['access_token' => 'rotated-xyz'])->save();

        $rows = DB::table('activity_log')
            ->where('subject_type', WhatsAppSender::class)
            ->where('subject_id', $sender->id)
            ->get();

        foreach ($rows as $row) {
            $this->assertStringNotContainsString('rotated-xyz', (string) $row->properties);
        }
    }

    public function test_expiring_reports_only_known_expiries_within_the_window(): void
    {
        $soon = $this->sender([
            'label' => 'soon',
            'phone_number_id' => '101',
            'token_expiry_mode' => WhatsAppTokenExpiryMode::Known->value,
            'token_expires_at' => now()->addDays(3),
        ]);
        $later = $this->sender([
            'label' => 'later',
            'phone_number_id' => '102',
            'token_expiry_mode' => WhatsAppTokenExpiryMode::Known->value,
            'token_expires_at' => now()->addDays(60),
        ]);
        $unknown = $this->sender(['label' => 'unknown', 'phone_number_id' => '103']);

        $expiring = (new SenderTokenService)->expiring();

        $this->assertTrue($expiring->contains('id', $soon->id));
        $this->assertFalse($expiring->contains('id', $later->id));
        $this->assertFalse($expiring->contains('id', $unknown->id));
    }

    public function test_unknown_expiry_reports_active_senders_only(): void
    {
        $active = $this->sender(['label' => 'active', 'phone_number_id' => '104']);
        $inactive = $this->sender([
            'label' => 'inactive',
            'phone_number_id' => '105',
            'is_active' => false,
        ]);

        $unknown = (new SenderTokenService)->unknownExpiry();

        $this->assertTrue($unknown->contains('id', $active->id));
        $this->assertFalse($unknown->contains('id', $inactive->id));
    }

    public function test_the_token_command_runs(): void
    {
        $this->sender();

        $this->artisan('whatsapp:tokens')->assertSuccessful();
    }
}
