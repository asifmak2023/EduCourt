<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\Campus;
use App\Models\Institution;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RbacTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->institution = Institution::create([
            'name' => 'Test Trust',
            'code' => 'TT',
        ]);

        $this->campus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus A',
            'code' => 'A',
            'type' => CampusType::School->value,
        ]);
    }

    public function test_campus_admin_cannot_create_institutions(): void
    {
        $admin = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $admin->syncRoles([RoleName::CampusAdmin->value]);

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->postJson('/api/v1/institutions', [
                'name' => 'Unauthorized University',
                'code' => 'UU',
            ])
            ->assertStatus(403);
    }

    public function test_platform_admin_can_create_institutions(): void
    {
        $super = User::factory()->create();
        $super->syncRoles([RoleName::PlatformAdmin->value]);

        $this->withToken($super->createToken('t')->plainTextToken)
            ->postJson('/api/v1/institutions', [
                'name' => 'New University',
                'code' => 'NU',
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.code', 'NU');
    }

    public function test_campus_admin_cannot_grant_platform_admin_role(): void
    {
        $admin = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $admin->syncRoles([RoleName::CampusAdmin->value]);

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->postJson('/api/v1/users', [
                'name' => 'Sneaky Admin',
                'email' => 'sneaky@example.test',
                'password' => 'secret-password',
                'roles' => [RoleName::PlatformAdmin->value],
            ])
            ->assertStatus(403);
    }

    public function test_product_owner_can_create_campus_admin(): void
    {
        $owner = User::factory()->create();
        $owner->syncRoles([RoleName::PlatformAdmin->value]);

        $this->withToken($owner->createToken('t')->plainTextToken)
            ->postJson('/api/v1/users', [
                'name' => 'New Campus Admin',
                'email' => 'newcampus@example.test',
                'password' => 'secret-password',
                'institution_id' => $this->institution->id,
                'campus_id' => $this->campus->id,
                'roles' => [RoleName::CampusAdmin->value],
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.campus_id', $this->campus->id);
    }

    public function test_campus_admin_can_create_a_local_account(): void
    {
        $admin = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $admin->syncRoles([RoleName::CampusAdmin->value]);

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->postJson('/api/v1/users', [
                'name' => 'Teacher One',
                'email' => 'teacher1@example.test',
                'password' => 'secret-password',
                'roles' => [RoleName::Teacher->value],
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.campus_id', $this->campus->id)
            ->assertJsonPath('data.roles.0', RoleName::Teacher->value);
    }

    public function test_campus_admin_cannot_create_another_campus_admin(): void
    {
        $admin = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $admin->syncRoles([RoleName::CampusAdmin->value]);

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->postJson('/api/v1/users', [
                'name' => 'Rogue Campus Admin',
                'email' => 'rogue@example.test',
                'password' => 'secret-password',
                'roles' => [RoleName::CampusAdmin->value],
            ])
            ->assertStatus(403);
    }
}
