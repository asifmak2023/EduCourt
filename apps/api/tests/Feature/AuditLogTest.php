<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\Campus;
use App\Models\Institution;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campusA;

    private Campus $campusB;

    private User $platformAdmin;

    private User $campusAdminA;

    private User $userA;

    private User $userB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->institution = Institution::create(['name' => 'Test Trust', 'code' => 'TT']);
        $this->campusA = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus A', 'code' => 'A', 'type' => CampusType::School->value,
        ]);
        $this->campusB = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus B', 'code' => 'B', 'type' => CampusType::School->value,
        ]);

        $this->platformAdmin = $this->actor(RoleName::PlatformAdmin, $this->campusA);
        $this->campusAdminA = $this->actor(RoleName::CampusAdmin, $this->campusA);
        $this->userA = $this->actor(RoleName::Teacher, $this->campusA);
        $this->userB = $this->actor(RoleName::Teacher, $this->campusB);

        activity()->useLog('campus-a-action')->causedBy($this->userA)->event('created')->log('created action on campus A');
        activity()->useLog('campus-b-action')->causedBy($this->userB)->event('updated')->log('updated action on campus B');
    }

    public function test_audit_log_requires_permission(): void
    {
        $this->api($this->userA)
            ->getJson('/api/v1/audit-logs')
            ->assertStatus(403);
    }

    public function test_platform_admin_sees_all_activity(): void
    {
        $response = $this->api($this->platformAdmin)
            ->getJson('/api/v1/audit-logs?per_page=100')
            ->assertOk();

        $logNames = collect($response->json('data'))->pluck('log_name');

        $this->assertTrue($logNames->contains('campus-a-action'));
        $this->assertTrue($logNames->contains('campus-b-action'));
    }

    public function test_campus_admin_only_sees_their_campus_activity(): void
    {
        $response = $this->api($this->campusAdminA)
            ->getJson('/api/v1/audit-logs?per_page=100')
            ->assertOk();

        $logNames = collect($response->json('data'))->pluck('log_name');

        $this->assertTrue($logNames->contains('campus-a-action'));
        $this->assertFalse($logNames->contains('campus-b-action'));
    }

    public function test_log_name_filter_narrows_results(): void
    {
        $response = $this->api($this->platformAdmin)
            ->getJson('/api/v1/audit-logs?log_name='.urlencode('campus-a-action').'&per_page=100')
            ->assertOk();

        $logNames = collect($response->json('data'))->pluck('log_name');

        $this->assertTrue($logNames->contains('campus-a-action'));
        $this->assertFalse($logNames->contains('campus-b-action'));

        $this->api($this->platformAdmin)
            ->getJson('/api/v1/audit-logs/filters')
            ->assertOk()
            ->assertJsonPath('data.events', fn ($events) => in_array('created', $events, true));
    }

    private function actor(RoleName $role, Campus $campus): User
    {
        $user = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $campus->id,
            'email' => Str::lower($role->value).'-'.Str::lower($campus->code).'@test.test',
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
