<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\Book;
use App\Models\BookIssue;
use App\Models\Campus;
use App\Models\Institution;
use App\Models\InventoryItem;
use App\Models\Lab;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OperationsTest extends TestCase
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

        $this->admin = $this->actor(RoleName::CampusAdmin);
    }

    public function test_inventory_movements_update_stock_and_low_stock_summary(): void
    {
        $category = $this->api($this->admin)->postJson('/api/v1/inventory/categories', [
            'name' => 'Stationery', 'code' => 'STAT',
        ])->assertStatus(201)->json('data');

        $item = $this->api($this->admin)->postJson('/api/v1/inventory/items', [
            'inventory_category_id' => $category['id'],
            'name' => 'Whiteboard Marker', 'code' => 'MRK-01', 'unit' => 'pcs',
            'unit_cost' => 50, 'quantity' => 10, 'reorder_level' => 5,
        ])->assertStatus(201)->assertJsonPath('data.is_low_stock', false)->json('data');

        $this->api($this->admin)->postJson("/api/v1/inventory/items/{$item['id']}/movements", [
            'type' => 'issue', 'quantity' => 8, 'moved_on' => '2026-09-20',
        ])->assertStatus(201);

        $refreshed = $this->api($this->admin)
            ->getJson("/api/v1/inventory/items/{$item['id']}")
            ->assertOk()
            ->assertJsonPath('data.quantity', 2)
            ->assertJsonPath('data.is_low_stock', true)
            ->json('data');

        $this->assertSame(2.0, (float) $refreshed['quantity']);

        $this->api($this->admin)->postJson("/api/v1/inventory/items/{$item['id']}/movements", [
            'type' => 'issue', 'quantity' => 5,
        ])->assertStatus(422);

        $this->api($this->admin)
            ->getJson('/api/v1/inventory/reports/summary')
            ->assertOk()
            ->assertJsonPath('data.low_stock', 1);

        $this->assertSame(2.0, (float) InventoryItem::query()->findOrFail($item['id'])->quantity);
    }

    public function test_library_issue_and_return_tracks_availability_and_fine(): void
    {
        $book = $this->api($this->admin)->postJson('/api/v1/library/books', [
            'title' => 'Physics 101', 'author' => 'Dr. Iqbal', 'total_copies' => 2,
        ])->assertStatus(201)->assertJsonPath('data.available_copies', 2)->json('data');

        $issue = $this->api($this->admin)->postJson('/api/v1/library/issues', [
            'book_id' => $book['id'], 'member_type' => 'student',
            'issued_on' => '2026-09-01', 'due_on' => '2026-09-05',
        ])->assertStatus(201)->assertJsonPath('data.status', 'issued')->json('data');

        $this->assertSame(1, Book::query()->findOrFail($book['id'])->available_copies);

        $returned = $this->api($this->admin)
            ->postJson("/api/v1/library/issues/{$issue['id']}/return", [
                'returned_on' => '2026-09-10', 'fine_per_day' => 5,
            ])->assertOk()
            ->assertJsonPath('data.status', 'returned')
            ->json('data');

        $this->assertSame(25.0, (float) $returned['fine_amount']);
        $this->assertSame(2, Book::query()->findOrFail($book['id'])->available_copies);

        $this->api($this->admin)
            ->getJson('/api/v1/library/reports/summary')
            ->assertOk()
            ->assertJsonPath('data.titles', 1)
            ->assertJsonPath('data.available', 2);

        $this->assertSame('returned', BookIssue::query()->findOrFail($issue['id'])->status->value);
    }

    public function test_lab_booking_detects_clashes_and_summarises_equipment(): void
    {
        $lab = $this->api($this->admin)->postJson('/api/v1/labs', [
            'name' => 'Chemistry Lab', 'code' => 'LAB-CHM', 'type' => 'science',
            'location' => 'Block B', 'capacity' => 30,
        ])->assertStatus(201)->json('data');

        $this->api($this->admin)->postJson("/api/v1/labs/{$lab['id']}/equipment", [
            'name' => 'Microscope', 'code' => 'MC-01', 'quantity' => 10,
            'condition' => 'working',
        ])->assertStatus(201);

        $this->api($this->admin)->postJson("/api/v1/labs/{$lab['id']}/equipment", [
            'name' => 'Bunsen Burner', 'quantity' => 4, 'condition' => 'under_repair',
        ])->assertStatus(201);

        $this->api($this->admin)->postJson('/api/v1/lab-bookings', [
            'lab_id' => $lab['id'], 'session_date' => '2026-10-01',
            'start_time' => '09:00', 'end_time' => '10:00', 'purpose' => 'Practical',
        ])->assertStatus(201);

        $this->api($this->admin)->postJson('/api/v1/lab-bookings', [
            'lab_id' => $lab['id'], 'session_date' => '2026-10-01',
            'start_time' => '09:30', 'end_time' => '10:30',
        ])->assertStatus(422);

        $this->api($this->admin)
            ->getJson("/api/v1/labs/{$lab['id']}/reports/summary")
            ->assertOk()
            ->assertJsonPath('data.equipment_count', 2)
            ->assertJsonPath('data.needs_attention', 1)
            ->assertJsonPath('data.upcoming_sessions', 1);

        $this->assertSame(1, Lab::query()->findOrFail($lab['id'])->bookings()->count());
    }

    public function test_operations_routes_require_permission(): void
    {
        $nobody = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);

        $this->api($nobody)->getJson('/api/v1/inventory/items')->assertStatus(403);
        $this->api($nobody)->getJson('/api/v1/library/books')->assertStatus(403);
        $this->api($nobody)->getJson('/api/v1/labs')->assertStatus(403);
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
