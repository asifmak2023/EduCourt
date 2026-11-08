<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\ReminderChannel;
use App\Enums\ReminderStatus;
use App\Enums\WhatsAppConnectionMode;
use App\Enums\WhatsAppDeliveryStatus;
use App\Enums\WhatsAppManagedBy;
use App\Enums\WhatsAppQuotaStatus;
use App\Models\Campus;
use App\Models\FeeReminder;
use App\Models\Institution;
use App\Models\IntegrationPolicy;
use App\Models\IntegrationTemplate;
use App\Models\Student;
use App\Models\WhatsAppConsent;
use App\Models\WhatsAppMessageEvent;
use App\Models\WhatsAppSender;
use App\Models\WhatsAppUsage;
use App\Services\Reminders\Gateways\WhatsAppReminderGateway;
use App\Services\WhatsApp\WhatsAppDeliveryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WhatsAppDeliveryTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private WhatsAppSender $sender;

    protected function setUp(): void
    {
        parent::setUp();

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
            'access_token' => 'token-a',
        ]);

        IntegrationPolicy::create([
            'institution_id' => $this->institution->id,
            'whatsapp_allowed' => true,
            'whatsapp_sender_id' => $this->sender->id,
        ]);
    }

    private function consent(string $status = 'opted_in', string $category = 'utility'): WhatsAppConsent
    {
        return WhatsAppConsent::create([
            'institution_id' => $this->institution->id,
            'business_account_id' => 'WABA-A',
            'phone' => '923001234567',
            'message_category' => $category,
            'status' => $status,
            'source' => 'admission_form',
        ]);
    }

    private function reminder(array $attributes = []): FeeReminder
    {
        $student = Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'admission_no' => 'A-'.uniqid(),
            'first_name' => 'Ali', 'last_name' => 'Raza',
            'gender' => 'male', 'status' => 'active',
        ]);

        return FeeReminder::create(array_merge([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $student->id,
            'channel' => ReminderChannel::WhatsApp,
            'recipient_phone' => '+923001234567',
            'recipient_name' => 'Guardian',
            'outstanding' => 1000,
            'bucket' => 'current',
            'days_overdue' => 5,
            'message' => 'Fee reminder body',
            'status' => ReminderStatus::Pending,
        ], $attributes));
    }

    private function gateway(): WhatsAppReminderGateway
    {
        return new WhatsAppReminderGateway(WhatsAppDeliveryService::make());
    }

    private function template(string $purpose = 'fee_reminder'): IntegrationTemplate
    {
        return IntegrationTemplate::create([
            'institution_id' => $this->institution->id,
            'sender_id' => $this->sender->id,
            'purpose' => $purpose,
            'name' => 'fee_reminder',
            'language' => 'en_US',
            'approval_status' => 'approved',
            'parameters' => [],
        ]);
    }

    public function test_send_without_consent_is_blocked(): void
    {
        Http::fake();
        $reminder = $this->reminder();

        $sent = $this->gateway()->send($reminder);

        $this->assertFalse($sent);
        $this->assertSame('no_whatsapp_consent', $reminder->fresh()->failure_reason);
        Http::assertNothingSent();
    }

    public function test_send_to_opted_out_guardian_is_blocked(): void
    {
        Http::fake();
        $this->consent('opted_out');
        $reminder = $this->reminder();

        $sent = $this->gateway()->send($reminder);

        $this->assertFalse($sent);
        $this->assertSame('no_whatsapp_consent', $reminder->fresh()->failure_reason);
        Http::assertNothingSent();
    }

    public function test_out_of_window_send_requires_an_approved_template(): void
    {
        Http::fake();
        $this->consent();
        $reminder = $this->reminder();

        $sent = $this->gateway()->send($reminder);

        $this->assertFalse($sent);
        $this->assertSame('template_required', $reminder->fresh()->failure_reason);
        Http::assertNothingSent();
    }

    public function test_out_of_window_send_uses_the_approved_template(): void
    {
        $this->template();
        $this->consent();
        $reminder = $this->reminder();

        Http::fake([
            'graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.1']]], 200),
        ]);

        $sent = $this->gateway()->send($reminder);

        $this->assertTrue($sent);
        Http::assertSent(fn ($request) => $request['type'] === 'template'
            && $request['template']['name'] === 'fee_reminder');
    }

    public function test_send_records_usage_and_provider_message_id(): void
    {
        $this->template();
        $this->consent();
        $reminder = $this->reminder();

        Http::fake([
            'graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.1']]], 200),
        ]);

        $this->gateway()->send($reminder);

        $usage = WhatsAppUsage::query()->first();

        $this->assertNotNull($usage);
        $this->assertSame(WhatsAppQuotaStatus::Consumed, $usage->quota_status);
        $this->assertSame(WhatsAppDeliveryStatus::Submitted, $usage->delivery_status);
        $this->assertSame('wamid.1', $usage->provider_message_id);
        $this->assertSame('wamid.1', $reminder->fresh()->provider_message_id);
    }

    public function test_in_window_send_uses_free_form_text(): void
    {
        $this->consent();
        $reminder = $this->reminder();

        WhatsAppMessageEvent::create([
            'integration_id' => $this->sender->id,
            'institution_id' => $this->institution->id,
            'contact_wa_id' => '923001234567',
            'direction' => 'inbound',
            'event' => 'message',
            'occurred_at' => now()->subHour(),
        ]);

        Http::fake([
            'graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.2']]], 200),
        ]);

        $sent = $this->gateway()->send($reminder);

        $this->assertTrue($sent);
        Http::assertSent(fn ($request) => $request['type'] === 'text');
    }

    public function test_quota_limit_blocks_sending(): void
    {
        $this->template();
        $this->consent();
        IntegrationPolicy::where('institution_id', $this->institution->id)
            ->update(['monthly_message_limit' => 1]);

        WhatsAppUsage::create([
            'institution_id' => $this->institution->id,
            'sender_id' => $this->sender->id,
            'delivery_intent_key' => 'prior',
            'attempt_number' => 1,
            'idempotency_key' => 'prior:1',
            'message_category' => 'utility',
            'quota_status' => 'consumed',
            'delivery_status' => 'submitted',
            'recipient' => '923001234567',
            'period' => now('Asia/Karachi')->format('Y-m'),
        ]);

        Http::fake();
        $reminder = $this->reminder();

        $sent = $this->gateway()->send($reminder);

        $this->assertFalse($sent);
        $this->assertSame('quota_exceeded', $reminder->fresh()->failure_reason);
        Http::assertNothingSent();
    }

    public function test_retry_after_submission_does_not_reserve_quota_twice(): void
    {
        $this->template();
        $this->consent();
        $reminder = $this->reminder();

        Http::fake([
            'graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.1']]], 200),
        ]);

        $this->gateway()->send($reminder);
        $this->gateway()->send($reminder->fresh());

        $this->assertSame(1, WhatsAppUsage::query()->count());
    }

    public function test_a_connection_timeout_marks_submission_unknown_and_does_not_retry(): void
    {
        $this->template();
        $this->consent();
        IntegrationPolicy::where('institution_id', $this->institution->id)
            ->update(['monthly_message_limit' => 5]);
        $reminder = $this->reminder();

        Http::fake(function () {
            throw new ConnectionException('timed out');
        });

        $sent = $this->gateway()->send($reminder);

        $this->assertFalse($sent);
        $this->assertSame('submission_unknown', $reminder->fresh()->failure_reason);

        $usage = WhatsAppUsage::query()->first();
        $this->assertSame(WhatsAppDeliveryStatus::SubmissionUnknown, $usage->delivery_status);

        // A second attempt must not silently resend.
        $second = $this->gateway()->send($reminder->fresh());
        $this->assertFalse($second);
        $this->assertSame(1, WhatsAppUsage::query()->count());
    }

    public function test_failed_submission_releases_quota(): void
    {
        $this->template();
        $this->consent();
        $reminder = $this->reminder();

        Http::fake([
            'graph.facebook.com/*' => Http::response([
                'error' => ['code' => 131026, 'message' => 'undeliverable'],
            ], 400),
        ]);

        $sent = $this->gateway()->send($reminder);

        $this->assertFalse($sent);
        $this->assertSame('recipient_undeliverable', $reminder->fresh()->failure_reason);
        $this->assertSame(WhatsAppQuotaStatus::Released, WhatsAppUsage::query()->first()->quota_status);
    }

    public function test_consent_withdrawal_is_recorded_without_erasing_history(): void
    {
        $consent = $this->consent();

        $consent->withdraw('portal');

        $fresh = $consent->fresh();
        $this->assertSame('opted_out', $fresh->status->value);
        $this->assertSame('portal', $fresh->source);
        $this->assertNotNull($fresh->opted_out_at);
    }
}
