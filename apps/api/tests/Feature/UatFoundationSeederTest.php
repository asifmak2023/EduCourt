<?php

namespace Tests\Feature;

use App\Enums\RoleName;
use App\Enums\ScopeType;
use App\Models\Institution;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Database\Seeders\Uat\UatFoundationSeeder;
use Database\Seeders\Uat\UatSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class UatFoundationSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);
    }

    public function test_foundation_seeder_provisions_one_institution_head_per_institution(): void
    {
        $data = (new UatFoundationSeeder)->seed();

        $this->assertCount(3, $data['tenants']);

        foreach ($data['tenants'] as $tenant) {
            /** @var Institution $institution */
            $institution = $tenant['institution'];
            $email = 'institutionhead.'.strtolower((string) $institution->code).'@'.UatFoundationSeeder::EMAIL_DOMAIN;

            $head = User::query()->where('email', $email)->first();

            $this->assertNotNull($head, 'Missing institution head for '.$institution->code);
            $this->assertTrue($head->hasRole(RoleName::InstitutionHead->value));
            $this->assertSame($institution->id, $head->institution_id);
            $this->assertNull($head->campus_id);

            $scope = $head->scopeAssignments()
                ->where('role', RoleName::InstitutionHead->value)
                ->first();

            $this->assertNotNull($scope);
            $this->assertSame(ScopeType::Institution, $scope->scope_type);
            $this->assertSame($institution->id, $scope->scope_id);
            $this->assertNull($scope->campus_id);
        }
    }

    public function test_institution_head_provisioned_by_seeder_can_login_and_read_head_office_reports(): void
    {
        (new UatFoundationSeeder)->seed();

        $login = $this->postJson('/api/v1/auth/login', [
            'email' => 'institutionhead.alnoor@'.UatFoundationSeeder::EMAIL_DOMAIN,
            'password' => UatFoundationSeeder::PASSWORD,
        ])->assertOk()->json();

        $this->withToken($login['token'])
            ->getJson('/api/v1/reports/head-office')
            ->assertOk();

        $this->withToken($login['token'])
            ->getJson('/api/v1/reports/institution-overview')
            ->assertOk();
    }

    public function test_foundation_seeder_is_idempotent_for_institution_heads(): void
    {
        (new UatFoundationSeeder)->seed();
        (new UatFoundationSeeder)->seed();

        $this->assertSame(
            3,
            User::query()->where('email', 'like', 'institutionhead.%@'.UatFoundationSeeder::EMAIL_DOMAIN)->count()
        );
    }

    public function test_uat_orchestrator_recreates_missing_roles_before_assigning_them(): void
    {
        Role::query()->where('name', RoleName::InstitutionHead->value)->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $this->assertFalse(
            Role::query()->where('name', RoleName::InstitutionHead->value)->exists(),
            'Role should be absent before running the orchestrator'
        );

        putenv('UAT_CAMPUSES=__none__');
        $_ENV['UAT_CAMPUSES'] = '__none__';
        $_SERVER['UAT_CAMPUSES'] = '__none__';

        try {
            $this->seed(UatSeeder::class);
        } finally {
            putenv('UAT_CAMPUSES');
            unset($_ENV['UAT_CAMPUSES'], $_SERVER['UAT_CAMPUSES']);
        }

        $this->assertTrue(
            Role::query()->where('name', RoleName::InstitutionHead->value)->exists(),
            'Orchestrator must recreate the institution_head role before assigning it'
        );
    }
}
