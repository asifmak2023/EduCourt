<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\Campus;
use App\Models\Complaint;
use App\Models\Institution;
use App\Models\Student;
use App\Models\StudentCertificate;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentAffairsTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $officer;

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

        $this->officer = $this->actor(RoleName::StudentAffairsOfficer);

        $this->student = Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'admission_no' => 'ADM-1', 'first_name' => 'Ali', 'last_name' => 'Raza',
            'gender' => 'male', 'status' => 'active',
        ]);
    }

    public function test_club_can_be_created_with_members(): void
    {
        $club = $this->api($this->officer)->postJson('/api/v1/student-affairs/clubs', [
            'name' => 'Science Society', 'code' => 'SCI',
            'category' => 'academic', 'description' => 'STEM activities',
        ])->assertStatus(201)->json('data');

        $this->api($this->officer)->postJson("/api/v1/student-affairs/clubs/{$club['id']}/members", [
            'student_id' => $this->student->id, 'role' => 'member', 'status' => 'active',
        ])->assertStatus(201)->assertJsonPath('data.student_id', $this->student->id);

        $this->api($this->officer)
            ->getJson("/api/v1/student-affairs/clubs/{$club['id']}/members")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $membership = $this->api($this->officer)
            ->getJson("/api/v1/student-affairs/clubs/{$club['id']}/members")
            ->json('data.0');

        $this->api($this->officer)
            ->deleteJson("/api/v1/student-affairs/clubs/{$club['id']}/members/{$membership['id']}")
            ->assertOk();

        $this->assertDatabaseMissing('club_memberships', ['id' => $membership['id'], 'deleted_at' => null]);
    }

    public function test_event_can_be_created_with_participants(): void
    {
        $event = $this->api($this->officer)->postJson('/api/v1/student-affairs/events', [
            'title' => 'Annual Sports Day', 'type' => 'sports',
            'starts_on' => '2026-10-10', 'ends_on' => '2026-10-11',
            'venue' => 'Main Ground', 'budget' => 5000, 'status' => 'planned',
        ])->assertStatus(201)->json('data');

        $this->api($this->officer)->postJson("/api/v1/student-affairs/events/{$event['id']}/participants", [
            'student_id' => $this->student->id, 'role' => 'athlete', 'status' => 'registered',
        ])->assertStatus(201)->assertJsonPath('data.student_id', $this->student->id);

        $this->api($this->officer)
            ->getJson("/api/v1/student-affairs/events/{$event['id']}/participants")
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_certificate_can_be_issued_with_serial_number(): void
    {
        $certificate = $this->api($this->officer)->postJson('/api/v1/student-affairs/certificates', [
            'student_id' => $this->student->id,
            'type' => 'character', 'title' => 'Character Certificate',
        ])->assertStatus(201)
            ->assertJsonPath('data.status', 'pending')
            ->json('data');

        $issued = $this->api($this->officer)
            ->postJson("/api/v1/student-affairs/certificates/{$certificate['id']}/issue")
            ->assertOk()
            ->assertJsonPath('data.status', 'issued')
            ->json('data');

        $this->assertNotNull($issued['serial_no']);
        $this->assertNotNull($issued['issued_on']);
        $this->assertSame('issued', StudentCertificate::query()->findOrFail($certificate['id'])->status->value);
    }

    public function test_welfare_record_tracks_follow_up(): void
    {
        $this->api($this->officer)->postJson('/api/v1/student-affairs/welfare-records', [
            'student_id' => $this->student->id, 'type' => 'medical',
            'title' => 'Asthma review', 'description' => 'Monthly check',
            'recorded_on' => '2026-09-10', 'status' => 'monitoring',
            'follow_up' => 'Review again in 30 days',
        ])->assertStatus(201)->assertJsonPath('data.type', 'medical');

        $this->api($this->officer)
            ->getJson('/api/v1/student-affairs/welfare-records?type=medical&from=2026-09-01&to=2026-09-30')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_alumni_and_council_member_can_be_registered(): void
    {
        $this->api($this->officer)->postJson('/api/v1/student-affairs/alumni', [
            'full_name' => 'Sara Khan', 'graduation_year' => '2020',
            'current_occupation' => 'Engineer', 'employer' => 'Acme',
        ])->assertStatus(201)->assertJsonPath('data.full_name', 'Sara Khan');

        $this->api($this->officer)
            ->getJson('/api/v1/student-affairs/alumni?search=Sara')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->api($this->officer)->postJson('/api/v1/student-affairs/council-members', [
            'student_id' => $this->student->id, 'position' => 'President',
            'term' => '2026-2027', 'is_active' => true,
        ])->assertStatus(201)->assertJsonPath('data.position', 'President');
    }

    public function test_complaint_lifecycle_assign_resolve(): void
    {
        $complaint = $this->api($this->officer)->postJson('/api/v1/student-affairs/complaints', [
            'student_id' => $this->student->id, 'category' => 'facility',
            'subject' => 'Broken desk', 'description' => 'Desk in room 5 is broken',
            'priority' => 'high',
        ])->assertStatus(201)
            ->assertJsonPath('data.status', 'open')
            ->json('data');

        $this->assertStringStartsWith('CMP-', $complaint['reference_no']);

        $this->api($this->officer)
            ->postJson("/api/v1/student-affairs/complaints/{$complaint['id']}/assign", [
                'assigned_to' => $this->officer->id,
            ])->assertOk()->assertJsonPath('data.status', 'in_progress');

        $this->api($this->officer)
            ->postJson("/api/v1/student-affairs/complaints/{$complaint['id']}/resolve", [
                'resolution' => 'Desk replaced',
            ])->assertOk()->assertJsonPath('data.status', 'resolved');

        $resolved = Complaint::query()->findOrFail($complaint['id']);
        $this->assertNotNull($resolved->resolved_at);
    }

    public function test_counselling_session_is_recorded(): void
    {
        $counsellor = $this->actor(RoleName::Counsellor);

        $this->api($counsellor)->postJson('/api/v1/student-affairs/counselling', [
            'student_id' => $this->student->id,
            'counsellor_user_id' => $counsellor->id,
            'session_date' => '2026-09-12', 'type' => 'individual',
            'status' => 'completed', 'summary' => 'Discussed study plan',
        ])->assertStatus(201)->assertJsonPath('data.status', 'completed');

        $this->api($counsellor)
            ->getJson('/api/v1/student-affairs/counselling?status=completed')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_student_affairs_routes_require_permission(): void
    {
        $nobody = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);

        $this->api($nobody)
            ->getJson('/api/v1/student-affairs/clubs')
            ->assertStatus(403);

        $this->api($nobody)
            ->getJson('/api/v1/student-affairs/counselling')
            ->assertStatus(403);
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
