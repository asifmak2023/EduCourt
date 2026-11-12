<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Enums\WhatsAppConnectionMode;
use App\Enums\WhatsAppManagedBy;
use App\Models\Campus;
use App\Models\Institution;
use App\Models\IntegrationPolicy;
use App\Models\IntegrationTemplate;
use App\Models\User;
use App\Models\WhatsAppSender;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class IntegrationApiTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private WhatsAppSender $sender;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->institution = Institution::create(['name' => 'School A', 'code' => 'SA']);
        $this->campus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus', 'code' => 'C', 'type' => CampusType::School->value,
        ]);

        $this->sender = WhatsAppSender::create([
            'owner_institution_id' => $this->institution->id,
            'managed_by' => WhatsAppManagedBy::Institution->value,
            'label' => 'main',
            'connection_mode' => WhatsAppConnectionMode::InstitutionManaged->value,
            'phone_number_id' => '100',
            'business_account_id' => 'WABA-A',
            'access_token' => 'secret-token',
        ]);

        IntegrationPolicy::create([
            'institution_id' => $this->institution->id,
            'whatsapp_allowed' => true,
            'whatsapp_self_service' => true,
            'whatsapp_sender_id' => $this->sender->id,
        ]);
    }

    private function actor(RoleName $role, ?Institution $institution = null, ?Campus $campus = null): User
    {
        $user = User::factory()->create([
            'institution_id' => $institution?->id ?? $this->institution->id,
            'campus_id' => $campus?->id ?? $this->campus->id,
        ]);
        $user->syncRoles([$role->value]);

        return $user;
    }

    private function as(User $user): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('t')->plainTextToken);
    }

    public function test_show_returns_the_integration_state_without_secrets(): void
    {
        $response = $this->as($this->actor(RoleName::CampusAdmin))
            ->getJson('/api/v1/integrations/whatsapp')
            ->assertOk();

        $response->assertJsonPath('data.enabled', true);
        $response->assertJsonPath('data.sender.has_access_token', true);
        $response->assertJsonPath('data.sender.label', 'main');
        $this->assertStringNotContainsString('secret-token', $response->getContent());
        $this->assertStringNotContainsString('"access_token":', $response->getContent());
    }

    public function test_institution_head_is_read_only(): void
    {
        $head = $this->actor(RoleName::InstitutionHead);

        $this->as($head)->getJson('/api/v1/integrations/whatsapp')->assertOk();
        $this->as($head)->putJson('/api/v1/integrations/whatsapp', [
            'monthly_message_limit' => 500,
        ])->assertForbidden();
    }

    public function test_it_administrator_cannot_edit_another_institution(): void
    {
        $other = Institution::create(['name' => 'School B', 'code' => 'SB']);
        $otherCampus = Campus::create([
            'institution_id' => $other->id,
            'name' => 'B Campus', 'code' => 'BC', 'type' => CampusType::School->value,
        ]);
        $otherSender = WhatsAppSender::create([
            'owner_institution_id' => $other->id,
            'managed_by' => WhatsAppManagedBy::Institution->value,
            'label' => 'b',
            'connection_mode' => WhatsAppConnectionMode::InstitutionManaged->value,
            'phone_number_id' => '200',
            'business_account_id' => 'WABA-B',
            'access_token' => 'b-token',
        ]);
        IntegrationPolicy::create([
            'institution_id' => $other->id,
            'whatsapp_allowed' => true,
            'whatsapp_self_service' => true,
            'whatsapp_sender_id' => $otherSender->id,
        ]);

        $itAdmin = $this->actor(RoleName::ItAdministrator);

        // Tenant isolation: the request always resolves to the actor's own
        // institution, so a foreign institution_id is ignored, not honoured.
        $this->as($itAdmin)
            ->putJson('/api/v1/integrations/whatsapp?institution_id='.$other->id, [
                'monthly_message_limit' => 99999,
            ])
            ->assertOk();

        $this->assertSame(99999, IntegrationPolicy::query()
            ->where('institution_id', $this->institution->id)
            ->value('monthly_message_limit'));

        $this->assertNull(IntegrationPolicy::query()
            ->where('institution_id', $other->id)
            ->value('monthly_message_limit'));
    }

    public function test_self_service_disabled_blocks_institution_writes(): void
    {
        IntegrationPolicy::where('institution_id', $this->institution->id)
            ->update(['whatsapp_self_service' => false]);

        $this->as($this->actor(RoleName::CampusAdmin))
            ->putJson('/api/v1/integrations/whatsapp', ['monthly_message_limit' => 10])
            ->assertForbidden();
    }

    public function test_platform_managed_sender_blocks_institution_writes(): void
    {
        $this->sender->update(['managed_by' => WhatsAppManagedBy::Platform->value]);

        $this->as($this->actor(RoleName::CampusAdmin))
            ->putJson('/api/v1/integrations/whatsapp', ['monthly_message_limit' => 10])
            ->assertForbidden();
    }

    public function test_platform_admin_can_assign_a_sender_to_an_institution(): void
    {
        $platform = User::factory()->create(['institution_id' => null, 'campus_id' => null]);
        $platform->syncRoles([RoleName::PlatformAdmin->value]);

        $policy = IntegrationPolicy::where('institution_id', $this->institution->id)->first();
        $policy->update(['whatsapp_sender_id' => null]);

        $this->as($platform)
            ->putJson('/api/v1/platform/institutions/'.$this->institution->id.'/integration-policy', [
                'whatsapp_allowed' => true,
                'whatsapp_sender_id' => $this->sender->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.whatsapp_sender_id', $this->sender->id);
    }

    public function test_platform_admin_can_list_and_create_senders(): void
    {
        Http::fake();
        $platform = User::factory()->create(['institution_id' => null, 'campus_id' => null]);
        $platform->syncRoles([RoleName::PlatformAdmin->value]);

        $this->as($platform)
            ->getJson('/api/v1/platform/whatsapp-senders')
            ->assertOk();

        $this->as($platform)
            ->postJson('/api/v1/platform/whatsapp-senders', [
                'label' => 'Platform shared',
                'connection_mode' => WhatsAppConnectionMode::PlatformManaged->value,
                'managed_by' => WhatsAppManagedBy::Platform->value,
                'phone_number_id' => '777',
                'business_account_id' => 'WABA-P',
                'access_token' => 'platform-secret',
            ])
            ->assertCreated()
            ->assertJsonPath('data.has_access_token', true)
            ->assertJsonMissingPath('data.access_token');
    }

    public function test_institution_roles_cannot_reach_platform_routes(): void
    {
        $this->as($this->actor(RoleName::CampusAdmin))
            ->getJson('/api/v1/platform/whatsapp-senders')
            ->assertForbidden();

        $this->as($this->actor(RoleName::ItAdministrator))
            ->getJson('/api/v1/platform/whatsapp-senders')
            ->assertForbidden();
    }

    public function test_verify_reports_credential_state_without_sending(): void
    {
        Http::fake([
            'graph.facebook.com/*' => Http::response(['id' => '100'], 200),
        ]);

        $this->as($this->actor(RoleName::CampusAdmin))
            ->postJson('/api/v1/integrations/whatsapp/verify')
            ->assertOk()
            ->assertJsonPath('ok', true);

        Http::assertSentCount(1);
    }

    public function test_test_send_actually_sends_a_message(): void
    {
        Http::fake([
            'graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.test']]], 200),
        ]);

        $this->as($this->actor(RoleName::CampusAdmin))
            ->postJson('/api/v1/integrations/whatsapp/test-send', ['to' => '+923001234567'])
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('message_id', 'wamid.test');
    }

    public function test_usage_reports_quota_counts_for_the_current_period(): void
    {
        $this->as($this->actor(RoleName::CampusAdmin))
            ->getJson('/api/v1/integrations/whatsapp/usage')
            ->assertOk()
            ->assertJsonPath('data.consumed', 0)
            ->assertJsonPath('data.monthly_message_limit', null);
    }

    public function test_a_template_can_be_registered_listed_and_removed(): void
    {
        $admin = $this->actor(RoleName::CampusAdmin);

        $created = $this->as($admin)
            ->postJson('/api/v1/integrations/whatsapp/templates', [
                'purpose' => 'reminder',
                'name' => 'fee_due_reminder',
                'language' => 'en_US',
                'parameters' => ['student_name', 'amount'],
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'fee_due_reminder')
            ->assertJsonPath('data.sender_id', $this->sender->id)
            ->assertJsonPath('data.approval_status', 'approved');

        $this->as($admin)
            ->getJson('/api/v1/integrations/whatsapp/templates')
            ->assertOk()
            ->assertJsonFragment(['name' => 'fee_due_reminder']);

        $this->as($admin)
            ->deleteJson('/api/v1/integrations/whatsapp/templates/'.$created->json('data.id'))
            ->assertOk();

        $this->assertSame(0, IntegrationTemplate::query()->count());
    }

    public function test_registering_a_template_requires_a_sender(): void
    {
        IntegrationPolicy::where('institution_id', $this->institution->id)
            ->update(['whatsapp_sender_id' => null]);

        $this->as($this->actor(RoleName::CampusAdmin))
            ->postJson('/api/v1/integrations/whatsapp/templates', [
                'purpose' => 'reminder',
                'name' => 'orphan',
                'language' => 'en_US',
            ])
            ->assertStatus(422);
    }

    public function test_a_template_cannot_be_deleted_across_institutions(): void
    {
        $other = Institution::create(['name' => 'School B', 'code' => 'SB']);
        $template = IntegrationTemplate::create([
            'institution_id' => $other->id,
            'sender_id' => $this->sender->id,
            'purpose' => 'reminder',
            'name' => 'foreign',
            'language' => 'en_US',
            'approval_status' => 'approved',
            'parameters' => [],
        ]);

        $this->as($this->actor(RoleName::CampusAdmin))
            ->deleteJson('/api/v1/integrations/whatsapp/templates/'.$template->id)
            ->assertNotFound();

        // The foreign template must survive; bypass the tenant scope to check it.
        $this->assertSame(1, IntegrationTemplate::withoutGlobalScopes()->count());
    }

    public function test_it_administrator_requires_two_factor(): void
    {
        $this->assertContains(RoleName::ItAdministrator, RoleName::twoFactorRequired());
    }
}
