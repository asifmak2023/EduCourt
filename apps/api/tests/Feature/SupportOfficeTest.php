<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\Campus;
use App\Models\Circular;
use App\Models\Institution;
use App\Models\PtmBooking;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupportOfficeTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

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

        $this->admin = $this->actor(RoleName::CampusAdmin);

        $this->student = Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'admission_no' => 'ADM-1', 'first_name' => 'Ali', 'last_name' => 'Raza',
            'gender' => 'male', 'status' => 'active',
        ]);
    }

    public function test_circular_lifecycle_publish_and_archive(): void
    {
        $circular = $this->api($this->admin)->postJson('/api/v1/circulars', [
            'title' => 'Parent Meeting', 'body' => 'Meeting on Friday',
            'audience' => 'parents',
        ])->assertStatus(201)->assertJsonPath('data.status', 'draft')->json('data');

        $this->api($this->admin)
            ->postJson("/api/v1/circulars/{$circular['id']}/archive")
            ->assertStatus(422);

        $this->api($this->admin)
            ->postJson("/api/v1/circulars/{$circular['id']}/publish")
            ->assertOk()
            ->assertJsonPath('data.status', 'published');

        $this->assertNotNull(Circular::query()->findOrFail($circular['id'])->published_at);

        $this->api($this->admin)
            ->postJson("/api/v1/circulars/{$circular['id']}/archive")
            ->assertOk()
            ->assertJsonPath('data.status', 'archived');

        $this->api($this->admin)
            ->getJson('/api/v1/circulars?status=archived')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_visitor_can_check_in_and_out(): void
    {
        $visitor = $this->api($this->admin)->postJson('/api/v1/visitors', [
            'name' => 'Imran Shah', 'phone' => '0300-1234567',
            'id_type' => 'cnic', 'id_number' => '35201-1234567-1',
            'purpose' => 'Parent meeting', 'person_to_meet' => 'Principal',
            'badge_no' => 'V-12',
        ])->assertStatus(201)->assertJsonPath('data.is_inside', true)->json('data');

        $this->assertNotNull($visitor['in_time']);

        $this->api($this->admin)
            ->getJson('/api/v1/visitors?inside=1')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $checkedOut = $this->api($this->admin)
            ->postJson("/api/v1/visitors/{$visitor['id']}/checkout")
            ->assertOk()
            ->assertJsonPath('data.is_inside', false)
            ->json('data');

        $this->assertNotNull($checkedOut['out_time']);

        $this->api($this->admin)
            ->postJson("/api/v1/visitors/{$visitor['id']}/checkout")
            ->assertStatus(422);
    }

    public function test_ptm_booking_respects_slot_capacity_and_cancel_releases_seat(): void
    {
        $event = $this->api($this->admin)->postJson('/api/v1/ptm-events', [
            'title' => 'Term 1 PTM', 'event_date' => '2026-10-05',
            'venue' => 'Main Hall',
        ])->assertStatus(201)->json('data');

        $slot = $this->api($this->admin)->postJson("/api/v1/ptm-events/{$event['id']}/slots", [
            'teacher_user_id' => $this->admin->id,
            'start_time' => '09:00', 'end_time' => '09:15', 'capacity' => 1,
            'room' => 'R-1',
        ])->assertStatus(201)->assertJsonPath('data.available', 1)->json('data');

        $booking = $this->api($this->admin)->postJson('/api/v1/ptm-bookings', [
            'ptm_slot_id' => $slot['id'], 'student_id' => $this->student->id,
            'guardian_name' => 'Mr. Raza', 'guardian_phone' => '0301-1111111',
        ])->assertStatus(201)->assertJsonPath('data.status', 'booked')->json('data');

        $this->api($this->admin)->postJson('/api/v1/ptm-bookings', [
            'ptm_slot_id' => $slot['id'], 'guardian_name' => 'Mrs. Khan',
        ])->assertStatus(422);

        $this->api($this->admin)
            ->getJson("/api/v1/ptm-events/{$event['id']}")
            ->assertOk()
            ->assertJsonPath('data.slots.0.booked', 1)
            ->assertJsonPath('data.slots.0.available', 0);

        $this->api($this->admin)
            ->postJson("/api/v1/ptm-bookings/{$booking['id']}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'cancelled');

        $this->assertSame('cancelled', PtmBooking::query()->findOrFail($booking['id'])->status->value);

        $this->api($this->admin)
            ->getJson("/api/v1/ptm-events/{$event['id']}")
            ->assertOk()
            ->assertJsonPath('data.slots.0.booked', 0);
    }

    public function test_ptm_booking_can_be_marked_attended(): void
    {
        $event = $this->api($this->admin)->postJson('/api/v1/ptm-events', [
            'title' => 'PTM', 'event_date' => '2026-10-06',
        ])->json('data');

        $slot = $this->api($this->admin)->postJson("/api/v1/ptm-events/{$event['id']}/slots", [
            'start_time' => '10:00', 'end_time' => '10:15', 'capacity' => 3,
        ])->json('data');

        $booking = $this->api($this->admin)->postJson('/api/v1/ptm-bookings', [
            'ptm_slot_id' => $slot['id'], 'guardian_name' => 'Mr. Raza',
        ])->json('data');

        $this->api($this->admin)
            ->postJson("/api/v1/ptm-bookings/{$booking['id']}/mark", ['status' => 'attended'])
            ->assertOk()
            ->assertJsonPath('data.status', 'attended');
    }

    public function test_support_routes_require_permission(): void
    {
        $nobody = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);

        $this->api($nobody)->getJson('/api/v1/circulars')->assertStatus(403);
        $this->api($nobody)->getJson('/api/v1/visitors')->assertStatus(403);
        $this->api($nobody)->getJson('/api/v1/ptm-events')->assertStatus(403);
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
