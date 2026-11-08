<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\Campus;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsFeeTenant;
use Tests\TestCase;

/**
 * An institution head has no campus of their own, so campus-scoped academic
 * and fee endpoints must be reachable once they pick a campus. This is the
 * flow the web campus switcher drives through the X-Campus-Id header.
 */
class InstitutionHeadCampusScopeTest extends TestCase
{
    use BuildsFeeTenant;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->setUpFeeTenant();
    }

    public function test_institution_head_without_campus_cannot_list_counter_students(): void
    {
        $head = $this->institutionHead();

        $this->as($head)
            ->getJson('/api/v1/fee-counter/students')
            ->assertStatus(403)
            ->assertJsonPath(
                'message',
                'Select a campus (X-Campus-Id header) to manage academic data.'
            );
    }

    public function test_institution_head_with_campus_can_list_and_bill(): void
    {
        $head = $this->institutionHead();

        $this->as($head)->withHeaders(['X-Campus-Id' => (string) $this->campus->id]);

        $response = $this->getJson('/api/v1/fee-counter/students')->assertOk();

        $ids = collect($response->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($this->ali->id));

        $this->postJson('/api/v1/fee-counter/generate', [
            'student_id' => $this->ali->id,
            'academic_year_id' => $this->year->id,
            'items' => [[
                'billing_kind' => 'monthly',
                'period_year' => 2026,
                'period_month' => 7,
                'title' => 'Tuition Fee',
                'amount' => 12000,
                'due_date' => '2026-07-10',
            ]],
        ])->assertStatus(201);
    }

    public function test_institution_head_cannot_bill_another_institutions_campus(): void
    {
        $head = $this->institutionHead();

        $otherInstitution = Institution::create(['name' => 'Other Trust', 'code' => 'OT']);
        $other = Campus::create([
            'institution_id' => $otherInstitution->id,
            'name' => 'Other Campus',
            'code' => 'OTH',
            'type' => CampusType::School->value,
        ]);

        $this->as($head)
            ->withHeaders(['X-Campus-Id' => (string) $other->id])
            ->getJson('/api/v1/fee-counter/students')
            ->assertStatus(403);
    }

    private function institutionHead(): User
    {
        $user = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => null,
        ]);
        $user->syncRoles([RoleName::InstitutionHead->value]);

        return $user;
    }
}
