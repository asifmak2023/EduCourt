<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\NotificationStatus;
use App\Enums\NotificationType;
use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Enums\WhatsAppConnectionMode;
use App\Enums\WhatsAppManagedBy;
use App\Models\AppNotification;
use App\Models\Campus;
use App\Models\FeeReminder;
use App\Models\Institution;
use App\Models\IntegrationPolicy;
use App\Models\Student;
use App\Models\WhatsAppConsent;
use App\Models\WhatsAppMessageEvent;
use App\Models\WhatsAppSender;
use App\Services\Notifications\Gateways\WhatsAppNotificationGateway;
use App\Services\Notifications\NotificationService;
use App\Services\Reminders\Gateways\WhatsAppReminderGateway;
use App\Services\Reminders\ReminderService;
use App\Services\WhatsApp\WhatsAppDeliveryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WhatsAppGatewayTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private Student $student;

    private WhatsAppSender $sender;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'reminders.gateway' => 'whatsapp',
            'reminders.channel' => 'whatsapp',
        ]);

        $this->institution = Institution::create(['name' => 'Test Trust', 'code' => 'TT']);
        $this->campus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus A', 'code' => 'A', 'type' => CampusType::School->value,
        ]);

        $this->student = Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'admission_no' => 'ADM-1',
            'first_name' => 'Ali', 'last_name' => 'Raza',
            'gender' => 'male', 'status' => 'active',
        ]);

        $this->sender = WhatsAppSender::create([
            'owner_institution_id' => $this->institution->id,
            'managed_by' => WhatsAppManagedBy::Institution->value,
            'label' => 'main',
            'connection_mode' => WhatsAppConnectionMode::InstitutionManaged->value,
            'phone_number_id' => '123456',
            'business_account_id' => 'WABA-TT',
            'access_token' => 'test-token',
            'default_country_code' => '92',
        ]);

        IntegrationPolicy::create([
            'institution_id' => $this->institution->id,
            'whatsapp_allowed' => true,
            'whatsapp_sender_id' => $this->sender->id,
        ]);

        WhatsAppConsent::create([
            'institution_id' => $this->institution->id,
            'business_account_id' => 'WABA-TT',
            'phone' => '923000000001',
            'message_category' => 'utility',
            'status' => 'opted_in',
            'source' => 'admission_form',
        ]);

        WhatsAppConsent::create([
            'institution_id' => $this->institution->id,
            'business_account_id' => 'WABA-TT',
            'phone' => '923000000002',
            'message_category' => 'utility',
            'status' => 'opted_in',
            'source' => 'admission_form',
        ]);
    }

    private function openServiceWindow(string ...$phones): void
    {
        foreach ($phones as $phone) {
            WhatsAppMessageEvent::create([
                'integration_id' => $this->sender->id,
                'institution_id' => $this->institution->id,
                'contact_wa_id' => $phone,
                'direction' => 'inbound',
                'event' => 'message',
                'occurred_at' => now()->subMinutes(5),
            ]);
        }
    }

    private function reminderGateway(): WhatsAppReminderGateway
    {
        return new WhatsAppReminderGateway(WhatsAppDeliveryService::make());
    }

    public function test_it_posts_a_whatsapp_text_message_to_the_cloud_api(): void
    {
        Http::fake([
            'graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.1']]], 200),
        ]);

        $this->openServiceWindow('923000000001');
        $reminder = $this->reminder(ReminderChannel::WhatsApp, '+92-300-0000001');

        $sent = $this->reminderGateway()->send($reminder);

        $this->assertTrue($sent);

        Http::assertSent(function (Request $request) {
            $payload = $request->data();

            return $request->url() === 'https://graph.facebook.com/v21.0/123456/messages'
                && $request->hasHeader('Authorization', 'Bearer test-token')
                && $payload['messaging_product'] === 'whatsapp'
                && $payload['to'] === '923000000001'
                && $payload['type'] === 'text'
                && $payload['text']['body'] === 'Fee reminder body';
        });
    }

    public function test_it_returns_false_when_the_api_rejects_the_message(): void
    {
        Http::fake([
            'graph.facebook.com/*' => Http::response(['error' => ['message' => 'Invalid token']], 401),
        ]);

        $this->openServiceWindow('923000000001');
        $reminder = $this->reminder(ReminderChannel::WhatsApp, '+92-300-0000001');

        $sent = $this->reminderGateway()->send($reminder);

        $this->assertFalse($sent);
    }

    public function test_it_returns_false_when_the_recipient_phone_is_missing(): void
    {
        Http::fake();

        $reminder = $this->reminder(ReminderChannel::WhatsApp, null);

        $sent = $this->reminderGateway()->send($reminder);

        $this->assertFalse($sent);
        Http::assertNothingSent();
    }

    public function test_it_returns_false_when_the_institution_has_no_sender(): void
    {
        Http::fake();

        IntegrationPolicy::where('institution_id', $this->institution->id)
            ->update(['whatsapp_sender_id' => null]);

        $this->openServiceWindow('923000000001');
        $reminder = $this->reminder(ReminderChannel::WhatsApp, '+92-300-0000001');

        $this->assertFalse($this->reminderGateway()->send($reminder));
        Http::assertNothingSent();
    }

    public function test_non_whatsapp_reminders_fall_back_to_the_log_driver(): void
    {
        Http::fake();

        $reminder = $this->reminder(ReminderChannel::Email, null);

        $sent = $this->reminderGateway()->send($reminder);

        $this->assertTrue($sent);
        Http::assertNothingSent();
    }

    public function test_notification_gateway_sends_a_whatsapp_message(): void
    {
        Http::fake([
            'graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.2']]], 200),
        ]);

        $this->openServiceWindow('923000000002');

        $notification = AppNotification::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $this->student->id,
            'type' => NotificationType::General,
            'channel' => ReminderChannel::WhatsApp,
            'recipient_name' => 'Imran Raza',
            'recipient_phone' => '+92-300-0000002',
            'title' => 'Absence notice',
            'body' => 'Ali Raza was marked absent.',
            'status' => NotificationStatus::Pending,
        ]);

        $sent = (new WhatsAppNotificationGateway(WhatsAppDeliveryService::make()))->send($notification);

        $this->assertTrue($sent);

        Http::assertSent(function (Request $request) {
            $payload = $request->data();

            return $payload['to'] === '923000000002'
                && str_contains($payload['text']['body'], 'Absence notice')
                && str_contains($payload['text']['body'], 'Ali Raza was marked absent.');
        });
    }

    public function test_a_reminder_is_marked_sent_when_whatsapp_delivery_succeeds(): void
    {
        Http::fake([
            'graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.3']]], 200),
        ]);

        $this->openServiceWindow('923000000001');
        $reminder = $this->reminder(ReminderChannel::WhatsApp, '+92-300-0000001');

        $result = app(ReminderService::class)->send($reminder);

        $this->assertSame(ReminderStatus::Sent, $result->status);
        $this->assertNotNull($result->sent_at);
    }

    public function test_a_reminder_is_marked_failed_when_whatsapp_delivery_fails(): void
    {
        Http::fake([
            'graph.facebook.com/*' => Http::response(['error' => ['message' => 'nope']], 500),
        ]);

        $this->openServiceWindow('923000000001');
        $reminder = $this->reminder(ReminderChannel::WhatsApp, '+92-300-0000001');

        $result = app(ReminderService::class)->send($reminder);

        $this->assertSame(ReminderStatus::Failed, $result->status);
        $this->assertNotNull($result->failure_reason);
    }

    public function test_gateway_factories_resolve_the_whatsapp_gateways_from_config(): void
    {
        $this->assertInstanceOf(WhatsAppNotificationGateway::class, NotificationService::makeGateway());
        $this->assertInstanceOf(WhatsAppReminderGateway::class, ReminderService::makeGateway());
    }

    private function reminder(ReminderChannel $channel, ?string $phone): FeeReminder
    {
        return FeeReminder::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $this->student->id,
            'academic_year_id' => null,
            'guardian_id' => null,
            'channel' => $channel,
            'recipient_name' => 'Imran Raza',
            'recipient_email' => 'imran@example.test',
            'recipient_phone' => $phone,
            'outstanding' => 1000,
            'bucket' => 'current',
            'days_overdue' => 0,
            'message' => 'Fee reminder body',
            'status' => ReminderStatus::Pending,
        ]);
    }
}
