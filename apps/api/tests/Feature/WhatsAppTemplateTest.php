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
use App\Models\IntegrationTemplate;
use App\Models\Student;
use App\Models\WhatsAppConsent;
use App\Models\WhatsAppMessageEvent;
use App\Models\WhatsAppSender;
use App\Services\Reminders\Gateways\WhatsAppReminderGateway;
use App\Services\WhatsApp\TemplateSelector;
use App\Services\WhatsApp\WhatsAppDeliveryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WhatsAppTemplateTest extends TestCase
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

        WhatsAppConsent::create([
            'institution_id' => $this->institution->id,
            'business_account_id' => 'WABA-A',
            'phone' => '923001234567',
            'message_category' => 'utility',
            'status' => 'opted_in',
            'source' => 'admission_form',
        ]);
    }

    private function gateway(): WhatsAppReminderGateway
    {
        return new WhatsAppReminderGateway(WhatsAppDeliveryService::make());
    }

    private function reminder(): FeeReminder
    {
        $student = Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'admission_no' => 'A-'.uniqid(),
            'first_name' => 'Ali', 'last_name' => 'Raza',
            'gender' => 'male', 'status' => 'active',
        ]);

        return FeeReminder::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'student_id' => $student->id,
            'channel' => ReminderChannel::WhatsApp,
            'recipient_name' => 'Imran Raza',
            'recipient_phone' => '+923001234567',
            'outstanding' => 4500,
            'bucket' => 'current',
            'oldest_due_date' => '2026-10-01',
            'days_overdue' => 38,
            'message' => 'Fee reminder body',
            'status' => ReminderStatus::Pending,
        ]);
    }

    private function template(array $parameters, string $status = 'approved', string $purpose = 'fee_reminder'): IntegrationTemplate
    {
        return IntegrationTemplate::create([
            'institution_id' => $this->institution->id,
            'sender_id' => $this->sender->id,
            'purpose' => $purpose,
            'name' => 'fee_reminder_v1',
            'language' => 'en_US',
            'approval_status' => $status,
            'parameters' => $parameters,
        ]);
    }

    private function openWindow(): void
    {
        WhatsAppMessageEvent::create([
            'integration_id' => $this->sender->id,
            'institution_id' => $this->institution->id,
            'contact_wa_id' => '923001234567',
            'direction' => 'inbound',
            'event' => 'message',
            'occurred_at' => now()->subMinutes(10),
        ]);
    }

    public function test_template_parameters_are_rendered_in_the_configured_order(): void
    {
        $this->template(['outstanding', 'recipient_name', 'days_overdue']);

        Http::fake([
            'graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.1']]], 200),
        ]);

        $this->gateway()->send($this->reminder());

        Http::assertSent(function (Request $request) {
            $params = $request['template']['components'][0]['parameters'] ?? [];

            return array_column($params, 'text') === ['4500.00', 'Imran Raza', '38'];
        });
    }

    public function test_template_without_explicit_parameters_uses_context_order(): void
    {
        $this->template([]);

        Http::fake([
            'graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.1']]], 200),
        ]);

        $this->gateway()->send($this->reminder());

        Http::assertSent(function (Request $request) {
            $params = $request['template']['components'][0]['parameters'] ?? [];

            return array_column($params, 'text') === ['Imran Raza', '4500.00', '2026-10-01', '38', 'Fee reminder body'];
        });
    }

    public function test_template_with_named_entries_is_supported(): void
    {
        $this->template([
            ['source' => 'recipient_name'],
            ['source' => 'outstanding'],
        ]);

        Http::fake([
            'graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.1']]], 200),
        ]);

        $this->gateway()->send($this->reminder());

        Http::assertSent(function (Request $request) {
            $params = $request['template']['components'][0]['parameters'] ?? [];

            return array_column($params, 'text') === ['Imran Raza', '4500.00'];
        });
    }

    public function test_unapproved_template_is_not_used(): void
    {
        $this->template(['recipient_name'], status: 'pending');

        Http::fake();
        $reminder = $this->reminder();

        $sent = $this->gateway()->send($reminder);

        $this->assertFalse($sent);
        $this->assertSame('template_required', $reminder->fresh()->failure_reason);
        Http::assertNothingSent();
    }

    public function test_template_from_another_sender_is_ignored(): void
    {
        $other = WhatsAppSender::create([
            'owner_institution_id' => $this->institution->id,
            'managed_by' => WhatsAppManagedBy::Institution->value,
            'label' => 'other',
            'connection_mode' => WhatsAppConnectionMode::InstitutionManaged->value,
            'phone_number_id' => '999',
            'business_account_id' => 'WABA-B',
            'access_token' => 'token-b',
        ]);

        IntegrationTemplate::create([
            'institution_id' => $this->institution->id,
            'sender_id' => $other->id,
            'purpose' => 'fee_reminder',
            'name' => 'wrong_sender',
            'language' => 'en_US',
            'approval_status' => 'approved',
            'parameters' => [],
        ]);

        Http::fake();
        $reminder = $this->reminder();

        $this->assertFalse($this->gateway()->send($reminder));
        $this->assertSame('template_required', $reminder->fresh()->failure_reason);
    }

    public function test_window_open_prefers_free_form_text_over_a_template(): void
    {
        $this->template(['recipient_name']);
        $this->openWindow();

        Http::fake([
            'graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.1']]], 200),
        ]);

        $this->gateway()->send($this->reminder());

        Http::assertSent(fn (Request $request) => $request['type'] === 'text');
    }

    public function test_a_template_parameter_mismatch_is_mapped(): void
    {
        $this->template(['recipient_name']);

        Http::fake([
            'graph.facebook.com/*' => Http::response([
                'error' => ['code' => 132000, 'message' => 'param count mismatch'],
            ], 400),
        ]);

        $reminder = $this->reminder();

        $this->assertFalse($this->gateway()->send($reminder));
        $this->assertSame('template_parameter_mismatch', $reminder->fresh()->failure_reason);
    }

    public function test_a_missing_template_is_mapped(): void
    {
        $this->template(['recipient_name']);

        Http::fake([
            'graph.facebook.com/*' => Http::response([
                'error' => ['code' => 132001, 'message' => 'template not found'],
            ], 400),
        ]);

        $reminder = $this->reminder();

        $this->gateway()->send($reminder);

        $this->assertSame('template_not_found', $reminder->fresh()->failure_reason);
    }

    public function test_reengagement_error_is_mapped_when_the_window_closed(): void
    {
        $this->template(['recipient_name']);

        Http::fake([
            'graph.facebook.com/*' => Http::response([
                'error' => ['code' => 131047, 'message' => 're-engagement required'],
            ], 400),
        ]);

        $reminder = $this->reminder();

        $this->gateway()->send($reminder);

        $this->assertSame('reengagement_required', $reminder->fresh()->failure_reason);
    }

    public function test_selector_returns_null_when_no_approved_purpose_matches(): void
    {
        $this->template(['recipient_name'], purpose: 'absence');

        $this->assertNull(
            (new TemplateSelector)->select($this->institution->id, $this->sender->id, 'fee_reminder')
        );
    }

    public function test_selector_ignores_another_institutions_template(): void
    {
        $other = Institution::create(['name' => 'School B', 'code' => 'SB']);
        IntegrationTemplate::create([
            'institution_id' => $other->id,
            'sender_id' => $this->sender->id,
            'purpose' => 'fee_reminder',
            'name' => 'other_school',
            'language' => 'en_US',
            'approval_status' => 'approved',
            'parameters' => [],
        ]);

        $this->assertNull(
            (new TemplateSelector)->select($this->institution->id, $this->sender->id, 'fee_reminder')
        );
    }
}
