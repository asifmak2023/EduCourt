<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\Campus;
use App\Models\Institution;
use App\Models\User;
use App\Support\TenantContext;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CodeGenerationTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campusA;

    private Campus $campusB;

    private User $adminA;

    private User $adminB;

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

        $this->adminA = $this->actor($this->campusA, RoleName::CampusAdmin);
        $this->adminB = $this->actor($this->campusB, RoleName::CampusAdmin);
    }

    public function test_stage_codes_are_generated_in_sequence(): void
    {
        $this->api($this->adminA)->postJson('/api/v1/stages', [
            'name' => 'Primary',
        ])->assertStatus(201)->assertJsonPath('data.code', 'STG-0001');

        $this->api($this->adminA)->postJson('/api/v1/stages', [
            'name' => 'Secondary',
        ])->assertStatus(201)->assertJsonPath('data.code', 'STG-0002');

        $this->api($this->adminA)
            ->getJson('/api/v1/stages/next-code')
            ->assertOk()
            ->assertJsonPath('data.code', 'STG-0003');
    }

    public function test_manual_code_is_kept_and_advances_the_sequence(): void
    {
        $this->api($this->adminA)->postJson('/api/v1/stages', [
            'name' => 'Primary',
        ])->assertStatus(201)->assertJsonPath('data.code', 'STG-0001');

        $this->api($this->adminA)->postJson('/api/v1/stages', [
            'name' => 'Custom', 'code' => 'PRIMARY-CUSTOM',
        ])->assertStatus(201)->assertJsonPath('data.code', 'PRIMARY-CUSTOM');

        $this->api($this->adminA)
            ->getJson('/api/v1/stages/next-code')
            ->assertOk()
            ->assertJsonPath('data.code', 'STG-0003');
    }

    public function test_blank_code_on_update_never_clears_the_existing_code(): void
    {
        $stage = $this->api($this->adminA)->postJson('/api/v1/stages', [
            'name' => 'Primary',
        ])->assertStatus(201)->json('data');

        $this->api($this->adminA)->putJson("/api/v1/stages/{$stage['id']}", [
            'name' => 'Primary School', 'code' => '',
        ])->assertOk()->assertJsonPath('data.code', 'STG-0001');
    }

    public function test_codes_are_scoped_per_campus_and_include_archived_rows(): void
    {
        $this->api($this->adminA)->postJson('/api/v1/stages', [
            'name' => 'Primary',
        ])->assertStatus(201)->assertJsonPath('data.code', 'STG-0001');

        $this->api($this->adminB)->postJson('/api/v1/stages', [
            'name' => 'Primary',
        ])->assertStatus(201)->assertJsonPath('data.code', 'STG-0001');

        $archived = $this->api($this->adminA)->postJson('/api/v1/stages', [
            'name' => 'Archived',
        ])->assertStatus(201)->json('data');

        $this->api($this->adminA)
            ->deleteJson("/api/v1/stages/{$archived['id']}")
            ->assertOk();

        $this->api($this->adminA)
            ->getJson('/api/v1/stages/next-code')
            ->assertOk()
            ->assertJsonPath('data.code', 'STG-0003');

        $this->api($this->adminB)
            ->getJson('/api/v1/stages/next-code')
            ->assertOk()
            ->assertJsonPath('data.code', 'STG-0002');
    }

    public function test_scholarship_and_concession_codes_are_generated(): void
    {
        $this->api($this->adminA)->postJson('/api/v1/scholarships', [
            'name' => 'Merit Award',
            'discount_type' => 'percentage',
            'value' => 10,
        ])->assertStatus(201)->assertJsonPath('data.code', 'SCH-0001');

        $this->api($this->adminA)
            ->getJson('/api/v1/scholarships/next-code')
            ->assertOk()
            ->assertJsonPath('data.code', 'SCH-0002');

        $this->api($this->adminA)->postJson('/api/v1/concession-policies', [
            'name' => 'Sibling Discount',
            'type' => 'sibling',
            'discount_type' => 'percentage',
            'value' => 5,
        ])->assertStatus(201)->assertJsonPath('data.code', 'CON-0001');

        $this->api($this->adminA)
            ->getJson('/api/v1/concession-policies/next-code')
            ->assertOk()
            ->assertJsonPath('data.code', 'CON-0002');
    }

    public function test_it_asset_tag_is_generated_when_omitted(): void
    {
        $admin = $this->actor($this->campusA, RoleName::ItAdministrator);

        $this->api($admin)->postJson('/api/v1/it/assets', [
            'name' => 'Dell Latitude',
        ])->assertStatus(201)->assertJsonPath('data.asset_tag', 'IT-0001');

        $this->api($admin)
            ->getJson('/api/v1/it/assets/next-code')
            ->assertOk()
            ->assertJsonPath('data.asset_tag', 'IT-0002');
    }

    public function test_institution_and_campus_codes_are_generated(): void
    {
        $super = User::factory()->create();
        $super->syncRoles([RoleName::PlatformAdmin->value]);
        $token = $super->createToken('t')->plainTextToken;

        $this->withToken($token)->postJson('/api/v1/institutions', [
            'name' => 'Second Trust',
        ])->assertStatus(201)->assertJsonPath('data.code', 'INS-0002');

        $this->withToken($token)->getJson('/api/v1/institutions/next-code')
            ->assertOk()
            ->assertJsonPath('data.code', 'INS-0003');

        $this->withToken($token)
            ->getJson("/api/v1/campuses/next-code?institution_id={$this->institution->id}")
            ->assertOk()
            ->assertJsonPath('data.code', 'CMP-0003');

        $this->withToken($token)->postJson('/api/v1/campuses', [
            'institution_id' => $this->institution->id,
            'name' => 'Campus C',
            'type' => CampusType::School->value,
        ])->assertStatus(201)->assertJsonPath('data.code', 'CMP-0003');
    }

    private function actor(Campus $campus, RoleName $role): User
    {
        $user = User::factory()->create([
            'institution_id' => $campus->institution_id,
            'campus_id' => $campus->id,
        ]);
        $user->syncRoles([$role->value]);

        return $user;
    }

    private function api(User $user): static
    {
        app(TenantContext::class)->clear();
        $this->app['auth']->forgetGuards();

        return $this->withToken($user->createToken('t')->plainTextToken);
    }
}
