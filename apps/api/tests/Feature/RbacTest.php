<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Enums\ScopeType;
use App\Models\Campus;
use App\Models\Institution;
use App\Models\ScopeAssignment;
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

    public function test_campus_admin_has_role_edit_permission(): void
    {
        $admin = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $admin->syncRoles([RoleName::CampusAdmin->value]);

        $this->assertTrue($admin->hasPermissionTo('role.edit'));
    }

    public function test_roles_catalog_includes_default_permissions(): void
    {
        $admin = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $admin->syncRoles([RoleName::CampusAdmin->value]);

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->getJson('/api/v1/meta/roles')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    [
                        'value',
                        'label',
                        'description',
                        'department',
                        'department_label',
                        'grantable_by_campus_admin',
                        'permissions',
                        'modules',
                    ],
                ],
                'modules',
            ])
            ->assertJsonFragment(['value' => RoleName::Teacher->value])
            ->assertJsonFragment(['grantable_by_campus_admin' => false, 'value' => RoleName::CampusAdmin->value]);
    }

    public function test_campus_admin_can_grant_and_revoke_a_local_role(): void
    {
        $admin = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $admin->syncRoles([RoleName::CampusAdmin->value]);

        $staff = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $staff->syncRoles([RoleName::Accountant->value]);

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->postJson('/api/v1/scope-assignments', [
                'user_id' => $staff->id,
                'role' => RoleName::Teacher->value,
                'scope_type' => ScopeType::Campus->value,
            ])
            ->assertCreated();

        $this->assertTrue($staff->fresh()->hasRole(RoleName::Teacher->value));
        $this->assertTrue($staff->fresh()->hasRole(RoleName::Accountant->value));

        $assignmentId = ScopeAssignment::query()
            ->where('user_id', $staff->id)
            ->where('role', RoleName::Teacher->value)
            ->value('id');

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->deleteJson("/api/v1/scope-assignments/{$assignmentId}")
            ->assertOk();

        $this->assertFalse($staff->fresh()->hasRole(RoleName::Teacher->value));
        $this->assertTrue($staff->fresh()->hasRole(RoleName::Accountant->value));
    }

    public function test_campus_admin_cannot_change_access_for_another_campus_admin(): void
    {
        $admin = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $admin->syncRoles([RoleName::CampusAdmin->value]);

        $peer = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $peer->syncRoles([RoleName::CampusAdmin->value]);

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->postJson('/api/v1/scope-assignments', [
                'user_id' => $peer->id,
                'role' => RoleName::Teacher->value,
                'scope_type' => ScopeType::Campus->value,
            ])
            ->assertStatus(403);
    }

    public function test_campus_admin_can_filter_staff_accounts(): void
    {
        $admin = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $admin->syncRoles([RoleName::CampusAdmin->value]);

        $teacher = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $teacher->syncRoles([RoleName::Teacher->value]);

        $student = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);
        $student->syncRoles([RoleName::Student->value]);

        $ids = collect(
            $this->withToken($admin->createToken('t')->plainTextToken)
                ->getJson('/api/v1/users?account_type=staff&per_page=100')
                ->assertOk()
                ->json('data')
        )->pluck('id');

        $this->assertTrue($ids->contains($teacher->id));
        $this->assertFalse($ids->contains($student->id));

        $portalIds = collect(
            $this->withToken($admin->createToken('t')->plainTextToken)
                ->getJson('/api/v1/users?account_type=portal&per_page=100')
                ->assertOk()
                ->json('data')
        )->pluck('id');

        $this->assertTrue($portalIds->contains($student->id));
        $this->assertFalse($portalIds->contains($teacher->id));

        $unassigned = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
        ]);

        $unassignedIds = collect(
            $this->withToken($admin->createToken('t')->plainTextToken)
                ->getJson('/api/v1/users?account_type=unassigned&per_page=100')
                ->assertOk()
                ->json('data')
        )->pluck('id');

        $this->assertTrue($unassignedIds->contains($unassigned->id));
        $this->assertFalse($unassignedIds->contains($teacher->id));
        $this->assertFalse($unassignedIds->contains($student->id));
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
