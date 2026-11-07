<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\NotificationStatus;
use App\Enums\NotificationType;
use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Models\AppNotification;
use App\Models\Campus;
use App\Models\FeeReminder;
use App\Models\Institution;
use App\Models\Student;
use App\Services\Notifications\Gateways\WhatsAppNotificationGateway;
use App\Services\Notifications\NotificationService;
use App\Services\Reminders\Gateways\WhatsAppReminderGateway;
use App\Services\Reminders\ReminderService;
use App\Services\WhatsApp\WhatsAppClient;
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

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'reminders.gateway' => 'whatsapp',
            'reminders.channel' => 'whatsapp',
            'reminders.whatsapp' => [
                'token' => 'test-token',
                'phone_number_id' => '123456',
                'base_url' => 'https://graph.facebook.com/v21.0',
                'timeout' => 5,
                'default_country_code' => '92',
            ],
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
    }

    public function test_it_posts_a_whatsapp_text_message_to_the_cloud_api(): void
    {
        Http::fake([
            'graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.1']]], 200),
        ]);

        $reminder = $this->reminder(ReminderChannel::WhatsApp, '+92-300-0000001');

        $sent = (new WhatsAppReminderGateway(WhatsAppClient::fromConfig()))->send($reminder);

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

        $reminder = $this->reminder(ReminderChannel::WhatsApp, '+92-300-0000001');

        $sent = (new WhatsAppReminderGateway(WhatsAppClient::fromConfig()))->send($reminder);

        $this->assertFalse($sent);
    }

    public function test_it_returns_false_when_the_recipient_phone_is_missing(): void
    {
        Http::fake();

        $reminder = $this->reminder(ReminderChannel::WhatsApp, null);

        $sent = (new WhatsAppReminderGateway(WhatsAppClient::fromConfig()))->send($reminder);

        $this->assertFalse($sent);
        Http::assertNothingSent();
    }

    public function test_it_returns_false_when_the_gateway_is_not_configured(): void
    {
        Http::fake();

        $reminder = $this->reminder(ReminderChannel::WhatsApp, '+92-300-0000001');

        $client = new WhatsAppClient(
            token: null,
            phoneNumberId: null,
            baseUrl: 'https://graph.facebook.com/v21.0',
            timeout: 5,
            defaultCountryCode: '92',
        );

        $this->assertFalse((new WhatsAppReminderGateway($client))->send($reminder));
        Http::assertNothingSent();
    }

    public function test_non_whatsapp_reminders_fall_back_to_the_log_driver(): void
    {
        Http::fake();

        $reminder = $this->reminder(ReminderChannel::Email, null);

        $sent = (new WhatsAppReminderGateway(WhatsAppClient::fromConfig()))->send($reminder);

        $this->assertTrue($sent);
        Http::assertNothingSent();
    }

    public function test_notification_gateway_sends_a_whatsapp_message(): void
    {
        Http::fake([
            'graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.2']]], 200),
        ]);

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

        $sent = (new WhatsAppNotificationGateway(WhatsAppClient::fromConfig()))->send($notification);

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

        $reminder = $this->reminder(ReminderChannel::WhatsApp, '+92-300-0000001');

        $service = app(ReminderService::class);
        $result = $service->send($reminder);

        $this->assertSame(ReminderStatus::Sent, $result->status);
        $this->assertNotNull($result->sent_at);
    }

    public function test_a_reminder_is_marked_failed_when_whatsapp_delivery_fails(): void
    {
        Http::fake([
            'graph.facebook.com/*' => Http::response(['error' => ['message' => 'nope']], 500),
        ]);

        $reminder = $this->reminder(ReminderChannel::WhatsApp, '+92-300-0000001');

        $service = app(ReminderService::class);
        $result = $service->send($reminder);

        $this->assertSame(ReminderStatus::Failed, $result->status);
        $this->assertNotNull($result->failure_reason);
    }

    public function test_notification_service_resolves_the_whatsapp_gateway_from_config(): void
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
