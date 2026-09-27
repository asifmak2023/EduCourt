<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\Campus;
use App\Models\Institution;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SportsTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $director;

    private Student $student;

    private array $sport;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->institution = Institution::create(['name' => 'Test Trust', 'code' => 'TT']);
        $this->campus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus A', 'code' => 'A', 'type' => CampusType::School->value,
        ]);

        $this->director = $this->actor(RoleName::SportsDirector);

        $this->student = Student::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'admission_no' => 'ADM-1', 'first_name' => 'Ali', 'last_name' => 'Raza',
            'gender' => 'male', 'status' => 'active',
            'date_of_birth' => now()->subYears(12)->toDateString(),
        ]);

        $this->sport = $this->api($this->director)->postJson('/api/v1/sports', [
            'name' => 'Cricket', 'code' => 'CRICKET', 'category' => 'outdoor',
            'season' => '2026-2027', 'budget' => 20000,
        ])->assertStatus(201)->json('data');
    }

    public function test_sport_team_and_squad_member_can_be_managed(): void
    {
        $this->assertSame('CRICKET', $this->sport['code']);
        $this->assertSame('outdoor', $this->sport['category']);

        $team = $this->api($this->director)->postJson('/api/v1/sports/teams', [
            'sport_id' => $this->sport['id'], 'name' => 'Senior XI',
            'age_group' => 'U-17', 'gender' => 'male',
        ])->assertStatus(201)->json('data');

        $this->api($this->director)->postJson("/api/v1/sports/teams/{$team['id']}/members", [
            'student_id' => $this->student->id, 'position' => 'Batsman', 'jersey_no' => '07',
        ])->assertStatus(201)->assertJsonPath('data.position', 'Batsman');

        $this->api($this->director)
            ->getJson("/api/v1/sports/teams/{$team['id']}/members")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->api($this->director)
            ->getJson('/api/v1/sports/teams?sport_id='.$this->sport['id'])
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Senior XI');
    }

    public function test_training_session_and_fixture_result_are_recorded(): void
    {
        $team = $this->team();

        $this->api($this->director)->postJson('/api/v1/sports/training-sessions', [
            'sport_team_id' => $team['id'], 'title' => 'Net practice',
            'session_date' => '2026-10-01', 'start_time' => '16:00', 'end_time' => '18:00',
            'venue' => 'Main Ground', 'focus' => 'Batting',
        ])->assertStatus(201)->assertJsonPath('data.title', 'Net practice');

        $fixture = $this->api($this->director)->postJson('/api/v1/sports/fixtures', [
            'sport_id' => $this->sport['id'], 'sport_team_id' => $team['id'],
            'opponent' => 'City School', 'home_away' => 'home',
            'fixture_date' => '2026-10-05', 'status' => 'scheduled',
        ])->assertStatus(201)->assertJsonPath('data.status', 'scheduled')->json('data');

        $this->api($this->director)
            ->postJson("/api/v1/sports/fixtures/{$fixture['id']}/result", [
                'our_score' => 180, 'opponent_score' => 150,
            ])->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.outcome', 'win');

        $this->api($this->director)
            ->getJson('/api/v1/sports/fixtures?outcome=win')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_achievement_can_be_recorded(): void
    {
        $this->api($this->director)->postJson('/api/v1/sports/achievements', [
            'sport_id' => $this->sport['id'], 'student_id' => $this->student->id,
            'title' => 'Best Player', 'level' => 'district', 'position' => '1st',
            'achieved_on' => '2026-10-12',
        ])->assertStatus(201)->assertJsonPath('data.level', 'district');

        $this->api($this->director)
            ->getJson('/api/v1/sports/achievements?level=district')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_equipment_stock_moves_through_issue_and_return(): void
    {
        $equipment = $this->equipment();

        $this->api($this->director)
            ->postJson("/api/v1/sports/equipment/{$equipment['id']}/movements", [
                'type' => 'purchase', 'quantity' => 10, 'movement_date' => '2026-09-20',
            ])->assertStatus(201)->assertJsonPath('data.balance_after', '10.00');

        $this->api($this->director)
            ->postJson("/api/v1/sports/equipment/{$equipment['id']}/movements", [
                'type' => 'issue', 'quantity' => 4, 'movement_date' => '2026-09-21',
            ])->assertStatus(201)->assertJsonPath('data.balance_after', '6.00');

        $this->assertDatabaseHas('sport_equipment', [
            'id' => $equipment['id'], 'quantity' => 10, 'available_quantity' => 6,
        ]);

        $this->api($this->director)
            ->postJson("/api/v1/sports/equipment/{$equipment['id']}/movements", [
                'type' => 'issue', 'quantity' => 99,
            ])->assertStatus(422)->assertJsonValidationErrors('quantity');

        $this->api($this->director)
            ->postJson("/api/v1/sports/equipment/{$equipment['id']}/movements", [
                'type' => 'return', 'quantity' => 2,
            ])->assertStatus(201)->assertJsonPath('data.balance_after', '8.00');

        $this->api($this->director)
            ->getJson("/api/v1/sports/equipment/{$equipment['id']}/movements")
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_eligibility_uses_age_and_attendance_thresholds(): void
    {
        $this->api($this->director)->putJson("/api/v1/sports/{$this->sport['id']}", [
            'min_age_years' => 10, 'max_age_years' => 15,
        ])->assertOk();

        $this->api($this->director)
            ->getJson("/api/v1/sports/{$this->sport['id']}/students/{$this->student->id}/eligibility")
            ->assertOk()
            ->assertJsonPath('data.eligible', true)
            ->assertJsonPath('data.age', 12);

        $this->api($this->director)->putJson("/api/v1/sports/{$this->sport['id']}", [
            'min_age_years' => 1, 'max_age_years' => 8,
        ])->assertOk();

        $this->api($this->director)
            ->getJson("/api/v1/sports/{$this->sport['id']}/students/{$this->student->id}/eligibility")
            ->assertOk()
            ->assertJsonPath('data.eligible', false)
            ->assertJsonPath('data.reasons.0', 'Maximum age is 8 years.');
    }

    public function test_sports_summary_reports_activity(): void
    {
        $team = $this->team();
        $this->api($this->director)->postJson("/api/v1/sports/teams/{$team['id']}/members", [
            'student_id' => $this->student->id,
        ])->assertStatus(201);

        $fixture = $this->api($this->director)->postJson('/api/v1/sports/fixtures', [
            'sport_id' => $this->sport['id'], 'opponent' => 'Rival School',
            'fixture_date' => '2026-10-05',
        ])->json('data');
        $this->api($this->director)
            ->postJson("/api/v1/sports/fixtures/{$fixture['id']}/result", [
                'our_score' => 2, 'opponent_score' => 2,
            ])->assertOk();

        $this->api($this->director)->postJson('/api/v1/sports/achievements', [
            'sport_id' => $this->sport['id'], 'title' => 'Champions',
            'level' => 'state', 'achieved_on' => '2026-10-20',
        ])->assertStatus(201);

        $equipment = $this->equipment(['quantity' => 5, 'unit_cost' => 100]);
        $this->assertSame('5.00', $equipment['quantity']);

        $summary = $this->api($this->director)
            ->getJson('/api/v1/sports/reports/summary')
            ->assertOk()->json('data');

        $this->assertSame(1, $summary['teams']);
        $this->assertSame(1, $summary['active_members']);
        $this->assertSame(1, $summary['fixtures']['completed']);
        $this->assertSame(1, $summary['fixtures']['draws']);
        $this->assertSame(1, $summary['achievements']);
        $this->assertSame(500.0, (float) $summary['equipment']['value']);
    }

    public function test_sports_routes_require_permission(): void
    {
        $nobody = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);

        $this->api($nobody)->getJson('/api/v1/sports')->assertStatus(403);

        $this->api($this->actor(RoleName::CanteenManager))
            ->getJson('/api/v1/sports/equipment')
            ->assertStatus(403);
    }

    /**
     * @return array<string, mixed>
     */
    private function team(): array
    {
        return $this->api($this->director)->postJson('/api/v1/sports/teams', [
            'sport_id' => $this->sport['id'], 'name' => 'Senior XI', 'age_group' => 'U-17',
        ])->assertStatus(201)->json('data');
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function equipment(array $overrides = []): array
    {
        return $this->api($this->director)->postJson('/api/v1/sports/equipment', array_merge([
            'sport_id' => $this->sport['id'], 'name' => 'Bat', 'code' => 'BAT-01',
            'quantity' => 0, 'unit_cost' => 50,
        ], $overrides))->assertStatus(201)->json('data');
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
