<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\MessagingMemberType;
use App\Enums\MessagingSegmentType;
use App\Enums\RoleName;
use App\Enums\WhatsAppConnectionMode;
use App\Enums\WhatsAppManagedBy;
use App\Models\AcademicYear;
use App\Models\Campus;
use App\Models\CampusIntegrationPolicy;
use App\Models\ClassRoom;
use App\Models\Guardian;
use App\Models\Institution;
use App\Models\IntegrationPolicy;
use App\Models\IntegrationTemplate;
use App\Models\MessagingAudience;
use App\Models\MessagingAudienceMember;
use App\Models\MessagingAudienceSegment;
use App\Models\MessagingBroadcast;
use App\Models\Section;
use App\Models\Stage;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\User;
use App\Models\WhatsAppConsent;
use App\Models\WhatsAppSender;
use App\Services\WhatsApp\BroadcastService;
use App\Services\WhatsApp\SenderResolver;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CampusMessagingTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campusA;

    private Campus $campusB;

    private WhatsAppSender $institutionSender;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->institution = Institution::create(['name' => 'Trust', 'code' => 'TR']);
        $this->campusA = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus A', 'code' => 'CA', 'type' => CampusType::School->value,
        ]);
        $this->campusB = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus B', 'code' => 'CB', 'type' => CampusType::School->value,
        ]);

        $this->institutionSender = $this->sender($this->institution->id, null, 'inst', '999');

        IntegrationPolicy::create([
            'institution_id' => $this->institution->id,
            'whatsapp_allowed' => true,
            'whatsapp_self_service' => true,
            'whatsapp_sender_id' => $this->institutionSender->id,
        ]);
    }

    private function sender(int $institutionId, ?int $campusId, string $label, string $phoneNumberId): WhatsAppSender
    {
        return WhatsAppSender::create([
            'owner_institution_id' => $institutionId,
            'owner_campus_id' => $campusId,
            'managed_by' => WhatsAppManagedBy::Institution->value,
            'label' => $label,
            'connection_mode' => WhatsAppConnectionMode::InstitutionManaged->value,
            'phone_number_id' => $phoneNumberId,
            'business_account_id' => 'WABA-'.$label,
            'access_token' => 'token-'.$label,
        ]);
    }

    private function actor(RoleName $role, ?Campus $campus = null): User
    {
        $user = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $campus?->id ?? $this->campusA->id,
        ]);
        $user->syncRoles([$role->value]);

        return $user;
    }

    private function as(User $user): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('t')->plainTextToken);
    }

    private function guardian(string $name, string $phone, Campus $campus): Guardian
    {
        return Guardian::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $campus->id,
            'name' => $name,
            'phone' => $phone,
        ]);
    }

    private function audience(Campus $campus, string $kind = 'broadcast'): MessagingAudience
    {
        return MessagingAudience::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $campus->id,
            'kind' => $kind,
            'name' => 'List '.uniqid(),
            'is_active' => true,
        ]);
    }

    public function test_a_campus_sender_takes_precedence_over_the_institution_sender(): void
    {
        $campusSender = $this->sender($this->institution->id, $this->campusA->id, 'campus-a', '111');

        CampusIntegrationPolicy::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campusA->id,
            'whatsapp_enabled' => true,
            'whatsapp_sender_id' => $campusSender->id,
        ]);

        $resolved = (new SenderResolver)->resolveForCampus($this->institution->id, $this->campusA->id);

        $this->assertTrue($resolved->ready);
        $this->assertSame($campusSender->id, $resolved->sender?->id);
    }

    public function test_a_campus_without_its_own_sender_falls_back_to_the_institution_sender(): void
    {
        $resolved = (new SenderResolver)->resolveForCampus($this->institution->id, $this->campusB->id);

        $this->assertTrue($resolved->ready);
        $this->assertSame($this->institutionSender->id, $resolved->sender?->id);
    }

    public function test_a_campus_never_borrows_another_campuss_sender(): void
    {
        $campusASender = $this->sender($this->institution->id, $this->campusA->id, 'campus-a', '111');

        CampusIntegrationPolicy::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campusB->id,
            'whatsapp_enabled' => true,
            // Deliberately points campus B at a sender owned by campus A.
            'whatsapp_sender_id' => $campusASender->id,
        ]);

        $resolved = (new SenderResolver)->resolveForCampus($this->institution->id, $this->campusB->id);

        // It must not use campus A's number; it falls back to the institution.
        $this->assertTrue($resolved->ready);
        $this->assertSame($this->institutionSender->id, $resolved->sender?->id);
    }

    public function test_a_disabled_campus_fails_closed_even_with_an_institution_sender(): void
    {
        CampusIntegrationPolicy::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campusA->id,
            'whatsapp_enabled' => false,
        ]);

        $resolved = (new SenderResolver)->resolveForCampus($this->institution->id, $this->campusA->id);

        $this->assertFalse($resolved->ready);
        $this->assertSame('campus_disabled', $resolved->failureReason);
    }

    public function test_the_institution_kill_switch_overrides_a_campus_sender(): void
    {
        $this->institutionSender->update(['is_active' => true]);
        IntegrationPolicy::query()->where('institution_id', $this->institution->id)
            ->update(['whatsapp_allowed' => false]);

        $campusSender = $this->sender($this->institution->id, $this->campusA->id, 'campus-a', '111');
        CampusIntegrationPolicy::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campusA->id,
            'whatsapp_enabled' => true,
            'whatsapp_sender_id' => $campusSender->id,
        ]);

        $resolved = (new SenderResolver)->resolveForCampus($this->institution->id, $this->campusA->id);

        $this->assertFalse($resolved->ready);
        $this->assertSame('platform_kill_switch', $resolved->failureReason);
    }

    public function test_an_audience_preview_expands_manual_members_and_dynamic_segments(): void
    {
        $audience = $this->audience($this->campusA);

        $guardian = $this->guardian('Manual Guardian', '03001234567', $this->campusA);
        MessagingAudienceMember::create([
            'audience_id' => $audience->id,
            'member_type' => MessagingMemberType::Guardian->value,
            'member_id' => $guardian->id,
        ]);
        MessagingAudienceMember::create([
            'audience_id' => $audience->id,
            'member_type' => MessagingMemberType::Phone->value,
            'display_name' => 'Pasted Number',
            'phone' => '03009998888',
        ]);

        $section = Section::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campusA->id,
            'class_room_id' => $this->classRoom($this->campusA)->id,
            'name' => 'A',
        ]);
        MessagingAudienceSegment::create([
            'audience_id' => $audience->id,
            'segment_type' => MessagingSegmentType::Section->value,
            'segment_ref' => $section->id,
        ]);

        $student = Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campusA->id,
            'admission_no' => 'S-1',
            'first_name' => 'Sara', 'last_name' => 'Khan',
            'gender' => 'female', 'status' => 'active',
        ]);
        $sectionGuardian = $this->guardian('Section Guardian', '03007776666', $this->campusA);
        $student->guardians()->attach($sectionGuardian->id, ['relationship' => 'mother', 'is_primary' => true]);
        StudentEnrollment::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campusA->id,
            'student_id' => $student->id,
            'section_id' => $section->id,
            'class_room_id' => $section->class_room_id,
            'academic_year_id' => $this->academicYear()->id,
            'starts_on' => now()->toDateString(),
        ]);

        $audience->load('members', 'segments');
        $recipients = BroadcastService::make()->recipients($audience);

        $phones = array_column($recipients, 'phone');
        sort($phones);

        $this->assertSame(['923001234567', '923007776666', '923009998888'], $phones);
    }

    public function test_a_broadcast_fans_out_one_message_per_recipient(): void
    {
        Http::fake([
            'graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid-1']]], 200),
        ]);

        $audience = $this->audience($this->campusA);

        foreach (['03001112222', '03003334444'] as $phone) {
            $guardian = $this->guardian('G '.$phone, $phone, $this->campusA);
            MessagingAudienceMember::create([
                'audience_id' => $audience->id,
                'member_type' => MessagingMemberType::Guardian->value,
                'member_id' => $guardian->id,
            ]);
        }

        foreach (['923001112222', '923003334444'] as $phone) {
            WhatsAppConsent::create([
                'institution_id' => $this->institution->id,
                'business_account_id' => 'WABA-inst',
                'phone' => $phone,
                'message_category' => 'utility',
                'status' => 'opted_in',
                'source' => 'portal',
            ]);
        }

        IntegrationTemplate::create([
            'institution_id' => $this->institution->id,
            'sender_id' => $this->institutionSender->id,
            'purpose' => 'notification',
            'name' => 'notice',
            'language' => 'en_US',
            'approval_status' => 'approved',
            'parameters' => [],
        ]);

        $broadcast = MessagingBroadcast::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campusA->id,
            'audience_id' => $audience->id,
            'title' => 'Notice',
            'body' => 'School closes early today.',
            'status' => 'queued',
        ]);

        $result = BroadcastService::make()->send($broadcast, $audience->load('members', 'segments'));

        $this->assertSame(2, $result['total']);
        $this->assertSame(2, $result['sent']);
        $this->assertSame(0, $result['failed']);
        $this->assertSame(2, $broadcast->fresh()->recipients_sent);

        Http::assertSentCount(2);
    }

    public function test_an_audience_can_be_created_and_listed_via_the_api(): void
    {
        $admin = $this->actor(RoleName::CampusAdmin);

        $created = $this->as($admin)
            ->postJson('/api/v1/messaging/audiences', [
                'campus_id' => $this->campusA->id,
                'kind' => 'group',
                'name' => 'Grade 5 Parents',
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Grade 5 Parents')
            ->assertJsonPath('data.kind', 'group');

        $id = $created->json('data.id');

        $this->as($admin)
            ->getJson('/api/v1/messaging/audiences')
            ->assertOk()
            ->assertJsonFragment(['id' => $id]);
    }

    public function test_an_audience_cannot_be_read_across_institutions(): void
    {
        $other = Institution::create(['name' => 'Other', 'code' => 'OT']);
        $otherCampus = Campus::create([
            'institution_id' => $other->id,
            'name' => 'Other Campus', 'code' => 'OC', 'type' => CampusType::School->value,
        ]);
        $foreign = MessagingAudience::create([
            'institution_id' => $other->id,
            'campus_id' => $otherCampus->id,
            'kind' => 'group',
            'name' => 'Foreign',
            'is_active' => true,
        ]);

        $this->as($this->actor(RoleName::CampusAdmin))
            ->getJson('/api/v1/messaging/audiences/'.$foreign->id)
            ->assertNotFound();
    }

    public function test_the_platform_admin_can_assign_a_campus_sender_and_policy(): void
    {
        $campusSender = $this->sender($this->institution->id, $this->campusA->id, 'campus-a', '111');
        $platform = $this->actor(RoleName::PlatformAdmin);

        $this->as($platform)
            ->putJson('/api/v1/platform/campuses/'.$this->campusA->id.'/integration-policy', [
                'whatsapp_enabled' => true,
                'whatsapp_self_service' => false,
                'whatsapp_sender_id' => $campusSender->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.whatsapp_sender_id', $campusSender->id)
            ->assertJsonPath('data.whatsapp_self_service', false);
    }

    public function test_an_institution_head_can_manage_audiences_without_the_edit_permission(): void
    {
        $head = $this->actor(RoleName::InstitutionHead);

        $this->assertFalse($head->hasPermissionTo('integration.edit'));
        $this->assertTrue($head->hasPermissionTo('integration.view'));

        $created = $this->as($head)
            ->postJson('/api/v1/messaging/audiences', [
                'campus_id' => $this->campusA->id,
                'kind' => 'group',
                'name' => 'Head Office Group',
            ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Head Office Group');

        $id = $created->json('data.id');

        $this->as($head)
            ->postJson('/api/v1/messaging/audiences/'.$id.'/segments', [
                'segment_type' => MessagingSegmentType::Campus->value,
                'segment_ref' => $this->campusA->id,
            ])
            ->assertCreated();

        $this->as($head)
            ->getJson('/api/v1/messaging/audiences/'.$id.'/preview')
            ->assertOk();
    }

    public function test_a_campus_admin_cannot_manage_audiences_when_self_service_is_off(): void
    {
        CampusIntegrationPolicy::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campusA->id,
            'whatsapp_enabled' => true,
            'whatsapp_self_service' => false,
        ]);

        $admin = $this->actor(RoleName::CampusAdmin, $this->campusA);

        $this->as($admin)
            ->postJson('/api/v1/messaging/audiences', [
                'campus_id' => $this->campusA->id,
                'kind' => 'group',
                'name' => 'Blocked Group',
            ])
            ->assertForbidden();
    }

    public function test_a_campus_admin_can_manage_audiences_when_self_service_is_on(): void
    {
        CampusIntegrationPolicy::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campusA->id,
            'whatsapp_enabled' => true,
            'whatsapp_self_service' => true,
        ]);

        $admin = $this->actor(RoleName::CampusAdmin, $this->campusA);

        $this->as($admin)
            ->postJson('/api/v1/messaging/audiences', [
                'campus_id' => $this->campusA->id,
                'kind' => 'group',
                'name' => 'Allowed Group',
            ])
            ->assertCreated();
    }

    public function test_the_platform_admin_can_create_a_campus_owned_sender(): void
    {
        $platform = $this->actor(RoleName::PlatformAdmin);

        $this->as($platform)
            ->postJson('/api/v1/platform/whatsapp-senders', [
                'owner_institution_id' => $this->institution->id,
                'owner_campus_id' => $this->campusA->id,
                'managed_by' => 'institution',
                'label' => 'Campus A line',
                'connection_mode' => 'institution_managed',
                'phone_number_id' => '555',
                'business_account_id' => 'WABA-CAMPA',
                'access_token' => 'campus-token',
            ])
            ->assertCreated()
            ->assertJsonPath('data.owner_campus_id', $this->campusA->id);
    }

    private function classRoom(Campus $campus): ClassRoom
    {
        $stage = Stage::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $campus->id,
            'name' => 'Primary',
            'code' => 'P'.uniqid(),
            'sequence' => 1,
        ]);

        return ClassRoom::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $campus->id,
            'stage_id' => $stage->id,
            'name' => 'Grade 5',
            'code' => 'G5'.uniqid(),
        ]);
    }

    private function academicYear(): AcademicYear
    {
        $existing = AcademicYear::query()->where('institution_id', $this->institution->id)->first();

        return $existing ?? AcademicYear::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campusA->id,
            'name' => '2025-2026',
            'code' => 'AY'.uniqid(),
            'starts_on' => now()->startOfYear()->toDateString(),
            'ends_on' => now()->endOfYear()->toDateString(),
            'is_current' => true,
        ]);
    }
}
