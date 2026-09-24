<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\Campus;
use App\Models\Institution;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institutionA;

    private Institution $institutionB;

    private Campus $campusA;

    private Campus $campusB;

    private Campus $campusC;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->institutionA = Institution::create(['name' => 'Trust A', 'code' => 'TA']);
        $this->institutionB = Institution::create(['name' => 'Trust B', 'code' => 'TB']);

        $this->campusA = Campus::create([
            'institution_id' => $this->institutionA->id,
            'name' => 'A-1', 'code' => 'A1', 'type' => CampusType::School->value,
        ]);
        $this->campusB = Campus::create([
            'institution_id' => $this->institutionA->id,
            'name' => 'A-2', 'code' => 'A2', 'type' => CampusType::School->value,
        ]);
        $this->campusC = Campus::create([
            'institution_id' => $this->institutionB->id,
            'name' => 'B-1', 'code' => 'B1', 'type' => CampusType::School->value,
        ]);
    }

    public function test_campus_admin_only_sees_users_from_their_campus(): void
    {
        $admin = $this->campusAdmin($this->campusA);
        $userA = User::factory()->create(['institution_id' => $this->institutionA->id, 'campus_id' => $this->campusA->id]);
        $userB = User::factory()->create(['institution_id' => $this->institutionA->id, 'campus_id' => $this->campusB->id]);

        $ids = $this->visibleUserIds($admin);

        $this->assertTrue($ids->contains($userA->id));
        $this->assertFalse($ids->contains($userB->id));
    }

    public function test_campus_admin_cannot_select_a_campus_from_another_institution(): void
    {
        $admin = $this->campusAdmin($this->campusA);
        $foreignUser = User::factory()->create(['institution_id' => $this->institutionB->id, 'campus_id' => $this->campusC->id]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$admin->createToken('t')->plainTextToken,
            'X-Campus-Id' => (string) $this->campusC->id,
        ])->getJson('/api/v1/users')->assertOk();

        $ids = collect($response->json('data'))->pluck('id');

        $this->assertFalse($ids->contains($foreignUser->id));
    }

    public function test_product_owner_sees_users_across_institutions(): void
    {
        $productOwner = User::factory()->create();
        $productOwner->syncRoles([RoleName::PlatformAdmin->value]);

        $userA = User::factory()->create(['institution_id' => $this->institutionA->id, 'campus_id' => $this->campusA->id]);
        $userC = User::factory()->create(['institution_id' => $this->institutionB->id, 'campus_id' => $this->campusC->id]);

        $ids = $this->visibleUserIds($productOwner);

        $this->assertTrue($ids->contains($userA->id));
        $this->assertTrue($ids->contains($userC->id));
    }

    public function test_product_owner_can_filter_to_one_campus(): void
    {
        $productOwner = User::factory()->create();
        $productOwner->syncRoles([RoleName::PlatformAdmin->value]);

        $userA = User::factory()->create(['institution_id' => $this->institutionA->id, 'campus_id' => $this->campusA->id]);
        $userB = User::factory()->create(['institution_id' => $this->institutionA->id, 'campus_id' => $this->campusB->id]);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer '.$productOwner->createToken('t')->plainTextToken,
            'X-Campus-Id' => (string) $this->campusA->id,
        ])->getJson('/api/v1/users')->assertOk();

        $ids = collect($response->json('data'))->pluck('id');

        $this->assertTrue($ids->contains($userA->id));
        $this->assertFalse($ids->contains($userB->id));
    }

    private function campusAdmin(Campus $campus): User
    {
        $user = User::factory()->create([
            'institution_id' => $campus->institution_id,
            'campus_id' => $campus->id,
        ]);
        $user->syncRoles([RoleName::CampusAdmin->value]);

        return $user;
    }

    /**
     * @return Collection<int, int>
     */
    private function visibleUserIds(User $actor)
    {
        $response = $this->withToken($actor->createToken('t')->plainTextToken)
            ->getJson('/api/v1/users?per_page=100')->assertOk();

        return collect($response->json('data'))->pluck('id');
    }
}
