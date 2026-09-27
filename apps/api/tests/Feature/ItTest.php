<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\Campus;
use App\Models\HelpdeskTicket;
use App\Models\Institution;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ItTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->institution = Institution::create(['name' => 'Test Trust', 'code' => 'TT']);
        $this->campus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus A', 'code' => 'A', 'type' => CampusType::School->value,
        ]);

        $this->admin = $this->actor(RoleName::ItAdministrator);
    }

    public function test_it_asset_assignment_and_return_lifecycle(): void
    {
        $asset = $this->api($this->admin)->postJson('/api/v1/it/assets', [
            'name' => 'Dell Latitude', 'asset_tag' => 'IT-0001', 'category' => 'laptop',
            'brand' => 'Dell', 'serial_no' => 'SN-123', 'cost' => 900,
            'warranty_until' => now()->addMonths(6)->toDateString(),
        ])->assertStatus(201)->json('data');

        $this->assertSame('available', $asset['status']);
        $this->assertTrue($asset['under_warranty']);

        $assignment = $this->api($this->admin)->postJson("/api/v1/it/assets/{$asset['id']}/assign", [
            'assigned_to' => $this->admin->id, 'condition' => 'good',
        ])->assertStatus(201)->json('data');

        $this->assertStringStartsWith(now()->toDateString(), (string) $assignment['assigned_on']);

        $this->assertDatabaseHas('it_assets', [
            'id' => $asset['id'], 'status' => 'assigned', 'assigned_to' => $this->admin->id,
        ]);

        $this->api($this->admin)
            ->postJson("/api/v1/it/assets/{$asset['id']}/assign", ['assigned_to' => $this->admin->id])
            ->assertStatus(422)->assertJsonValidationErrors('status');

        $returned = $this->api($this->admin)
            ->postJson("/api/v1/it/assets/{$asset['id']}/return", ['condition' => 'fair'])
            ->assertOk()->json('data');

        $this->assertSame('available', $returned['status']);

        $this->api($this->admin)
            ->getJson("/api/v1/it/assets/{$asset['id']}/assignments")
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_helpdesk_ticket_sla_assignment_and_resolution(): void
    {
        $ticket = $this->api($this->admin)->postJson('/api/v1/it/tickets', [
            'subject' => 'Printer not working', 'description' => 'Floor 2 printer offline',
            'category' => 'hardware', 'priority' => 'critical',
        ])->assertStatus(201)
            ->assertJsonPath('data.status', 'open')
            ->assertJsonPath('data.is_overdue', false)
            ->json('data');

        $this->assertStringStartsWith('TKT-', $ticket['ticket_no']);
        $this->assertSame(
            now()->addHours(4)->toDateString(),
            Carbon::parse($ticket['sla_due_at'])->toDateString()
        );

        $this->api($this->admin)
            ->postJson("/api/v1/it/tickets/{$ticket['id']}/assign", ['assigned_to' => $this->admin->id])
            ->assertOk()->assertJsonPath('data.status', 'in_progress');

        $this->api($this->admin)
            ->postJson("/api/v1/it/tickets/{$ticket['id']}/comments", [
                'body' => 'Checking the print spooler.', 'is_internal' => true,
            ])->assertStatus(201)->assertJsonPath('data.is_internal', true);

        $this->api($this->admin)
            ->postJson("/api/v1/it/tickets/{$ticket['id']}/resolve", ['resolution' => 'Restarted spooler'])
            ->assertOk()->assertJsonPath('data.status', 'resolved');

        $this->api($this->admin)
            ->postJson("/api/v1/it/tickets/{$ticket['id']}/close")
            ->assertOk()->assertJsonPath('data.status', 'closed');

        $this->api($this->admin)
            ->getJson("/api/v1/it/tickets/{$ticket['id']}/comments")
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_overdue_tickets_are_flagged(): void
    {
        $this->api($this->admin)->postJson('/api/v1/it/tickets', [
            'subject' => 'Old issue', 'description' => 'Raised long ago',
            'priority' => 'low', 'reported_at' => now()->subDays(10)->toDateTimeString(),
        ])->assertStatus(201)
            ->assertJsonPath('data.is_overdue', true);

        $this->api($this->admin)
            ->getJson('/api/v1/it/tickets?overdue=1')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->assertTrue(HelpdeskTicket::query()->first()->isOverdue());
    }

    public function test_change_request_approval_workflow(): void
    {
        $change = $this->api($this->admin)->postJson('/api/v1/it/change-requests', [
            'title' => 'Upgrade campus firewall', 'description' => 'Firmware upgrade',
            'type' => 'network', 'risk' => 'high', 'status' => 'submitted',
            'planned_on' => '2026-10-20', 'rollback_plan' => 'Restore previous firmware',
        ])->assertStatus(201)->assertJsonPath('data.status', 'submitted')->json('data');

        $this->api($this->admin)
            ->postJson("/api/v1/it/change-requests/{$change['id']}/decide", [
                'status' => 'approved', 'decision_notes' => 'Approved by IT head',
            ])->assertOk()->assertJsonPath('data.status', 'approved');

        $this->api($this->admin)
            ->postJson("/api/v1/it/change-requests/{$change['id']}/decide", [
                'status' => 'implemented', 'implemented_on' => '2026-10-21',
            ])->assertOk()
            ->assertJsonPath('data.status', 'implemented')
            ->assertJsonPath('data.implemented_on', '2026-10-21');
    }

    public function test_backups_and_systems_are_tracked(): void
    {
        $this->api($this->admin)->postJson('/api/v1/it/backups', [
            'name' => 'Nightly DB', 'type' => 'database', 'status' => 'success',
            'started_at' => '2026-09-26 02:00:00', 'finished_at' => '2026-09-26 02:10:00',
            'size_mb' => 512, 'location' => 's3://backups/db',
        ])->assertStatus(201)->assertJsonPath('data.type', 'database');

        $this->api($this->admin)->postJson('/api/v1/it/backups', [
            'name' => 'Nightly DB', 'type' => 'database', 'status' => 'failed',
            'started_at' => '2026-09-27 02:00:00',
        ])->assertStatus(201);

        $this->api($this->admin)->postJson('/api/v1/it/systems', [
            'name' => 'Student Portal', 'type' => 'portal',
            'url' => 'https://portal.test', 'status' => 'up', 'uptime_percent' => 99.5,
        ])->assertStatus(201)->assertJsonPath('data.status', 'up');

        $this->api($this->admin)->postJson('/api/v1/it/systems', [
            'name' => 'Email', 'type' => 'email', 'status' => 'degraded',
        ])->assertStatus(201);

        $this->api($this->admin)
            ->getJson('/api/v1/it/backups?status=failed')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_it_summary_reports_operations(): void
    {
        $asset = $this->api($this->admin)->postJson('/api/v1/it/assets', [
            'name' => 'Switch', 'asset_tag' => 'IT-1000', 'category' => 'network', 'cost' => 300,
        ])->json('data');
        $this->api($this->admin)->postJson("/api/v1/it/assets/{$asset['id']}/assign", [
            'assigned_to' => $this->admin->id,
        ])->assertStatus(201);

        $this->api($this->admin)->postJson('/api/v1/it/tickets', [
            'subject' => 'Wi-Fi down', 'description' => 'No signal', 'priority' => 'high',
        ])->assertStatus(201);

        $this->api($this->admin)->postJson('/api/v1/it/change-requests', [
            'title' => 'New VLAN', 'description' => 'Add VLAN', 'status' => 'submitted',
        ])->assertStatus(201);

        $this->api($this->admin)->postJson('/api/v1/it/backups', [
            'name' => 'Nightly', 'status' => 'success', 'started_at' => '2026-09-26 02:00:00',
        ])->assertStatus(201);

        $this->api($this->admin)->postJson('/api/v1/it/systems', [
            'name' => 'LMS', 'status' => 'down',
        ])->assertStatus(201);

        $summary = $this->api($this->admin)
            ->getJson('/api/v1/it/reports/summary')
            ->assertOk()->json('data');

        $this->assertSame(1, $summary['assets']['total']);
        $this->assertSame(1, $summary['assets']['assigned']);
        $this->assertSame(300.0, (float) $summary['assets']['total_value']);
        $this->assertSame(1, $summary['tickets']['open']);
        $this->assertSame(1, $summary['changes']['pending']);
        $this->assertSame(1, $summary['backups']['total']);
        $this->assertSame('success', $summary['backups']['last_status']);
        $this->assertSame(1, $summary['systems']['down']);
    }

    public function test_it_routes_require_permission(): void
    {
        $nobody = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);

        $this->api($nobody)->getJson('/api/v1/it/assets')->assertStatus(403);
        $this->api($this->actor(RoleName::Librarian))->getJson('/api/v1/it/tickets')->assertStatus(403);
    }

    private function actor(RoleName $role): User
    {
        $user = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $user->syncRoles([$role->value]);

        return $user;
    }

    private function api(User $user): self
    {
        $this->app['auth']->forgetGuards();

        $this->withToken($user->createToken('t')->plainTextToken);

        return $this;
    }
}
