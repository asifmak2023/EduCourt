<?php

namespace Tests\Feature;

use App\Enums\RoleName;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsFeeTenant;
use Tests\TestCase;

class InstitutionCurrencyTest extends TestCase
{
    use BuildsFeeTenant;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->setUpFeeTenant();
    }

    public function test_institution_currency_uses_the_configured_default(): void
    {
        config()->set('currencies.default', 'SAR');

        $this->as($this->platformAdmin())
            ->postJson('/api/v1/institutions', ['name' => 'Gulf Trust'])
            ->assertStatus(201)
            ->assertJsonPath('data.currency', 'SAR');
    }

    public function test_institution_currency_is_normalized_on_create(): void
    {
        $this->as($this->platformAdmin())
            ->postJson('/api/v1/institutions', [
                'name' => 'Gulf Trust',
                'currency' => 'aed',
            ])
            ->assertStatus(201)
            ->assertJsonPath('data.currency', 'AED');
    }

    public function test_currency_cannot_change_after_financial_records_exist(): void
    {
        $this->generateCharge($this->ali, 12000);

        app(TenantContext::class)->clear();

        $this->as($this->platformAdmin())
            ->putJson("/api/v1/institutions/{$this->institution->id}", ['currency' => 'USD'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('currency');
    }

    private function platformAdmin(): User
    {
        $user = User::factory()->create();
        $user->syncRoles([RoleName::PlatformAdmin->value]);

        return $user;
    }
}
