<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\Campus;
use App\Models\HostelRoom;
use App\Models\Institution;
use App\Models\Student;
use App\Models\TransportAllocation;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransportHostelTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $incharge;

    private Student $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->institution = Institution::create(['name' => 'Test Trust', 'code' => 'TT']);
        $this->campus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus A', 'code' => 'A', 'type' => CampusType::School->value,
        ]);

        $this->incharge = $this->actor(RoleName::TransportHostelIncharge);

        $this->student = Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'admission_no' => 'ADM-1', 'first_name' => 'Ali', 'last_name' => 'Raza',
            'gender' => 'male', 'status' => 'active',
        ]);
    }

    public function test_transport_route_allocation_uses_stop_fare_and_blocks_duplicates(): void
    {
        $vehicle = $this->api($this->incharge)->postJson('/api/v1/transport/vehicles', [
            'name' => 'Bus 1', 'registration_no' => 'LEB-1234', 'type' => 'bus', 'capacity' => 40,
        ])->assertStatus(201)->json('data');

        $route = $this->api($this->incharge)->postJson('/api/v1/transport/routes', [
            'name' => 'North Route', 'code' => 'NR-1', 'start_point' => 'Depot',
            'end_point' => 'Campus', 'distance_km' => 12, 'fare' => 2000,
            'vehicle_id' => $vehicle['id'],
        ])->assertStatus(201)->json('data');

        $stop = $this->api($this->incharge)->postJson("/api/v1/transport/routes/{$route['id']}/stops", [
            'name' => 'Gulberg', 'sequence' => 1, 'pickup_time' => '07:00', 'drop_time' => '14:30', 'fare' => 1500,
        ])->assertStatus(201)->json('data');

        $allocation = $this->api($this->incharge)->postJson('/api/v1/transport/allocations', [
            'student_id' => $this->student->id, 'transport_route_id' => $route['id'],
            'transport_route_stop_id' => $stop['id'], 'direction' => 'both',
        ])->assertStatus(201)
            ->assertJsonPath('data.fare', 1500)
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.vehicle_id', $vehicle['id'])
            ->json('data');

        $this->api($this->incharge)->postJson('/api/v1/transport/allocations', [
            'student_id' => $this->student->id, 'transport_route_id' => $route['id'],
        ])->assertStatus(422);

        $this->api($this->incharge)
            ->postJson("/api/v1/transport/allocations/{$allocation['id']}/deallocate")
            ->assertOk()
            ->assertJsonPath('data.status', 'inactive');

        $this->assertSame('inactive', TransportAllocation::query()->findOrFail($allocation['id'])->status->value);

        $this->api($this->incharge)
            ->getJson('/api/v1/transport/reports/summary')
            ->assertOk()
            ->assertJsonPath('data.vehicles', 1)
            ->assertJsonPath('data.routes', 1)
            ->assertJsonPath('data.allocated_students', 0);
    }

    public function test_hostel_room_allocation_respects_capacity_and_vacates(): void
    {
        $hostel = $this->api($this->incharge)->postJson('/api/v1/hostels', [
            'name' => 'Boys Hostel', 'code' => 'BH-1', 'type' => 'boys', 'capacity' => 1,
        ])->assertStatus(201)->json('data');

        $room = $this->api($this->incharge)->postJson("/api/v1/hostels/{$hostel['id']}/rooms", [
            'room_no' => '101', 'type' => 'single', 'capacity' => 1, 'monthly_fee' => 8000,
        ])->assertStatus(201)->assertJsonPath('data.available', 1)->json('data');

        $allocation = $this->api($this->incharge)->postJson('/api/v1/hostel-allocations', [
            'hostel_room_id' => $room['id'], 'student_id' => $this->student->id, 'bed_no' => 'A',
        ])->assertStatus(201)
            ->assertJsonPath('data.status', 'allocated')
            ->assertJsonPath('data.monthly_fee', 8000)
            ->json('data');

        $this->assertSame(1, HostelRoom::query()->findOrFail($room['id'])->occupied);

        $other = Student::create([
            'institution_id' => $this->institution->id, 'campus_id' => $this->campus->id,
            'admission_no' => 'ADM-2', 'first_name' => 'Bilal', 'last_name' => 'Khan',
            'gender' => 'male', 'status' => 'active',
        ]);

        $this->api($this->incharge)->postJson('/api/v1/hostel-allocations', [
            'hostel_room_id' => $room['id'], 'student_id' => $other->id,
        ])->assertStatus(422);

        $this->api($this->incharge)
            ->postJson("/api/v1/hostel-allocations/{$allocation['id']}/vacate")
            ->assertOk()
            ->assertJsonPath('data.status', 'vacated');

        $this->assertSame(0, HostelRoom::query()->findOrFail($room['id'])->occupied);

        $this->api($this->incharge)
            ->getJson("/api/v1/hostels/{$hostel['id']}/reports/summary")
            ->assertOk()
            ->assertJsonPath('data.capacity', 1)
            ->assertJsonPath('data.occupied', 0)
            ->assertJsonPath('data.available', 1);
    }

    public function test_hostel_outpass_workflow(): void
    {
        $hostel = $this->api($this->incharge)->postJson('/api/v1/hostels', [
            'name' => 'Boys Hostel', 'code' => 'BH-1', 'type' => 'boys',
        ])->json('data');

        $room = $this->api($this->incharge)->postJson("/api/v1/hostels/{$hostel['id']}/rooms", [
            'room_no' => '102', 'capacity' => 2,
        ])->json('data');

        $allocation = $this->api($this->incharge)->postJson('/api/v1/hostel-allocations', [
            'hostel_room_id' => $room['id'], 'student_id' => $this->student->id,
        ])->json('data');

        $outpass = $this->api($this->incharge)->postJson('/api/v1/hostel-outpasses', [
            'hostel_allocation_id' => $allocation['id'], 'student_id' => $this->student->id,
            'from_datetime' => '2026-10-01 16:00:00', 'to_datetime' => '2026-10-02 09:00:00',
            'reason' => 'Family wedding',
        ])->assertStatus(201)->assertJsonPath('data.status', 'pending')->json('data');

        $this->api($this->incharge)
            ->postJson("/api/v1/hostel-outpasses/{$outpass['id']}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->api($this->incharge)
            ->postJson("/api/v1/hostel-outpasses/{$outpass['id']}/return")
            ->assertOk()
            ->assertJsonPath('data.status', 'returned');
    }

    public function test_transport_and_hostel_routes_require_permission(): void
    {
        $nobody = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);

        $this->api($nobody)->getJson('/api/v1/transport/vehicles')->assertStatus(403);
        $this->api($nobody)->getJson('/api/v1/hostels')->assertStatus(403);
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
