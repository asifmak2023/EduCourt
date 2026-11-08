<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Enums\WhatsAppConnectionMode;
use App\Enums\WhatsAppManagedBy;
use App\Models\Campus;
use App\Models\FeeReminder;
use App\Models\Institution;
use App\Models\IntegrationPolicy;
use App\Models\Student;
use App\Models\WhatsAppSender;
use App\Services\Reminders\Gateways\WhatsAppReminderGateway;
use App\Services\WhatsApp\SenderResolver;
use App\Services\WhatsApp\WhatsAppDeliveryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SenderResolutionTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institutionA;

    private Institution $institutionB;

    private Campus $campusA;

    private Campus $campusB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->institutionA = Institution::create(['name' => 'School A', 'code' => 'SA']);
        $this->institutionB = Institution::create(['name' => 'School B', 'code' => 'SB']);

        $this->campusA = Campus::create([
            'institution_id' => $this->institutionA->id,
            'name' => 'A Campus', 'code' => 'AC', 'type' => CampusType::School->value,
        ]);
        $this->campusB = Campus::create([
            'institution_id' => $this->institutionB->id,
            'name' => 'B Campus', 'code' => 'BC', 'type' => CampusType::School->value,
        ]);
    }

    private function senderFor(Institution $institution, string $phoneNumberId, string $token): WhatsAppSender
    {
        return WhatsAppSender::create([
            'owner_institution_id' => $institution->id,
            'managed_by' => WhatsAppManagedBy::Institution->value,
            'label' => $institution->code.' sender',
            'connection_mode' => WhatsAppConnectionMode::InstitutionManaged->value,
            'phone_number_id' => $phoneNumberId,
            'business_account_id' => 'WABA-'.$institution->code,
            'access_token' => $token,
        ]);
    }

    private function policyFor(Institution $institution, ?WhatsAppSender $sender): IntegrationPolicy
    {
        return IntegrationPolicy::create([
            'institution_id' => $institution->id,
            'whatsapp_allowed' => true,
            'whatsapp_sender_id' => $sender?->id,
        ]);
    }

    public function test_resolver_returns_not_ready_without_a_policy(): void
    {
        $resolved = (new SenderResolver)->resolve($this->institutionA->id);

        $this->assertFalse($resolved->ready);
        $this->assertSame('no_policy_configured', $resolved->failureReason);
    }

    public function test_resolver_returns_not_ready_without_an_assigned_sender(): void
    {
        $this->policyFor($this->institutionA, null);

        $resolved = (new SenderResolver)->resolve($this->institutionA->id);

        $this->assertFalse($resolved->ready);
        $this->assertSame('no_sender_assigned', $resolved->failureReason);
    }

    public function test_resolver_is_blocked_by_the_platform_kill_switch(): void
    {
        $sender = $this->senderFor($this->institutionA, '100', 'token-a');
        IntegrationPolicy::create([
            'institution_id' => $this->institutionA->id,
            'whatsapp_allowed' => false,
            'whatsapp_sender_id' => $sender->id,
        ]);

        $resolved = (new SenderResolver)->resolve($this->institutionA->id);

        $this->assertFalse($resolved->ready);
        $this->assertSame('platform_kill_switch', $resolved->failureReason);
    }

    public function test_resolver_is_blocked_for_a_disabled_sender(): void
    {
        $sender = WhatsAppSender::create([
            'owner_institution_id' => $this->institutionA->id,
            'managed_by' => WhatsAppManagedBy::Institution->value,
            'label' => 'disabled',
            'connection_mode' => WhatsAppConnectionMode::Disabled->value,
            'phone_number_id' => '101',
            'business_account_id' => 'WABA-A',
            'access_token' => 'token-a',
        ]);
        $this->policyFor($this->institutionA, $sender);

        $resolved = (new SenderResolver)->resolve($this->institutionA->id);

        $this->assertFalse($resolved->ready);
        $this->assertSame('sender_disabled', $resolved->failureReason);
    }

    public function test_resolver_rejects_an_institution_managed_sender_owned_by_another(): void
    {
        $senderB = $this->senderFor($this->institutionB, '200', 'token-b');
        $this->policyFor($this->institutionA, $senderB);

        $resolved = (new SenderResolver)->resolve($this->institutionA->id);

        $this->assertFalse($resolved->ready);
        $this->assertSame('sender_not_owned', $resolved->failureReason);
    }

    public function test_resolver_requires_credentials(): void
    {
        $sender = WhatsAppSender::create([
            'owner_institution_id' => $this->institutionA->id,
            'managed_by' => WhatsAppManagedBy::Institution->value,
            'label' => 'empty',
            'connection_mode' => WhatsAppConnectionMode::InstitutionManaged->value,
            'phone_number_id' => '102',
            'business_account_id' => 'WABA-A',
        ]);
        $this->policyFor($this->institutionA, $sender);

        $resolved = (new SenderResolver)->resolve($this->institutionA->id);

        $this->assertFalse($resolved->ready);
        $this->assertSame('configuration_required', $resolved->failureReason);
    }

    public function test_institutions_resolve_their_own_senders_independently(): void
    {
        $senderA = $this->senderFor($this->institutionA, '100', 'token-a');
        $senderB = $this->senderFor($this->institutionB, '200', 'token-b');
        $this->policyFor($this->institutionA, $senderA);
        $this->policyFor($this->institutionB, $senderB);

        $resolvedA = (new SenderResolver)->resolve($this->institutionA->id);
        $resolvedB = (new SenderResolver)->resolve($this->institutionB->id);

        $this->assertSame('token-a', $resolvedA->token());
        $this->assertSame('token-b', $resolvedB->token());
        $this->assertSame('100', $resolvedA->phoneNumberId());
        $this->assertSame('200', $resolvedB->phoneNumberId());
    }

    public function test_an_inactive_sender_never_falls_back_to_another_sender(): void
    {
        $senderA = $this->senderFor($this->institutionA, '100', 'token-a');
        $senderA->update(['is_active' => false]);
        $this->policyFor($this->institutionA, $senderA);

        $resolved = (new SenderResolver)->resolve($this->institutionA->id);

        $this->assertFalse($resolved->ready);
        $this->assertSame('sender_inactive', $resolved->failureReason);
    }

    public function test_delivery_fails_closed_when_no_sender_is_assigned(): void
    {
        $this->policyFor($this->institutionA, null);

        Http::fake();

        $student = Student::create([
            'institution_id' => $this->institutionA->id,
            'campus_id' => $this->campusA->id,
            'admission_no' => 'A-1',
            'first_name' => 'Ali', 'last_name' => 'Raza',
            'gender' => 'male', 'status' => 'active',
        ]);

        $reminder = FeeReminder::create([
            'institution_id' => $this->institutionA->id,
            'campus_id' => $this->campusA->id,
            'student_id' => $student->id,
            'channel' => ReminderChannel::WhatsApp,
            'recipient_phone' => '+923001234567',
            'recipient_name' => 'Guardian',
            'outstanding' => 1000,
            'bucket' => 'current',
            'days_overdue' => 5,
            'message' => 'Test reminder',
            'status' => ReminderStatus::Pending,
        ]);

        $sent = (new WhatsAppReminderGateway(WhatsAppDeliveryService::make()))->send($reminder);

        $this->assertFalse($sent);
        $this->assertSame(ReminderStatus::Failed, $reminder->fresh()->status);
        $this->assertSame('no_sender_assigned', $reminder->fresh()->failure_reason);
        Http::assertNothingSent();
    }
}
