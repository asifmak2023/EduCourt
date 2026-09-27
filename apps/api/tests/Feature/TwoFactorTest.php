<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\Campus;
use App\Models\Institution;
use App\Models\User;
use App\Services\Auth\Totp;
use App\Services\Auth\TwoFactorService;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TwoFactorTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->institution = Institution::create(['name' => 'Test Trust', 'code' => 'TT']);
        $this->campus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus A', 'code' => 'A', 'type' => CampusType::School->value,
        ]);

        $this->admin = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'email' => 'admin@test.test',
        ]);
        $this->admin->syncRoles([RoleName::CampusAdmin->value]);
    }

    public function test_enrolment_generates_a_secret_and_confirms_with_a_valid_code(): void
    {
        $response = $this->api($this->admin)->postJson('/api/v1/auth/two-factor/enable')
            ->assertStatus(201)
            ->assertJsonPath('otpauth_url', fn (string $url) => str_starts_with($url, 'otpauth://totp/'))
            ->assertJsonCount(8, 'recovery_codes');

        $secret = $response->json('secret');

        $this->assertSame($secret, $this->admin->refresh()->two_factor_secret);
        $this->assertNotSame($secret, DB::table('users')->where('id', $this->admin->id)->value('two_factor_secret'));
        $this->assertFalse($this->admin->hasTwoFactorEnabled());

        $this->api($this->admin)->postJson('/api/v1/auth/two-factor/confirm', [
            'code' => $this->code($secret),
        ])->assertOk()->assertJsonPath('two_factor_enabled', true);

        $this->assertTrue($this->admin->refresh()->hasTwoFactorEnabled());
    }

    public function test_enrolment_rejects_an_invalid_confirmation_code(): void
    {
        $this->api($this->admin)->postJson('/api/v1/auth/two-factor/enable')->assertStatus(201);

        $this->api($this->admin)->postJson('/api/v1/auth/two-factor/confirm', [
            'code' => '000000',
        ])->assertStatus(422)->assertJsonValidationErrors('code');

        $this->assertFalse($this->admin->refresh()->hasTwoFactorEnabled());
    }

    public function test_login_requires_a_challenge_when_two_factor_is_enabled(): void
    {
        $secret = $this->enrol($this->admin)['secret'];

        $login = $this->postJson('/api/v1/auth/login', [
            'email' => $this->admin->email,
            'password' => 'password',
        ])->assertOk()
            ->assertJsonPath('two_factor_required', true)
            ->assertJsonMissingPath('token');

        $challenge = $login->json('challenge_token');
        $this->assertNotEmpty($challenge);

        $this->postJson('/api/v1/auth/two-factor/challenge', [
            'challenge_token' => $challenge,
            'code' => $this->code($secret),
        ])->assertOk()
            ->assertJsonPath('user.id', $this->admin->id)
            ->assertJsonStructure(['token']);

        $this->postJson('/api/v1/auth/two-factor/challenge', [
            'challenge_token' => $challenge,
            'code' => $this->code($secret),
        ])->assertStatus(422);
    }

    public function test_challenge_rejects_an_invalid_code(): void
    {
        $this->enrol($this->admin);

        $challenge = $this->postJson('/api/v1/auth/login', [
            'email' => $this->admin->email,
            'password' => 'password',
        ])->json('challenge_token');

        $this->postJson('/api/v1/auth/two-factor/challenge', [
            'challenge_token' => $challenge,
            'code' => '000000',
        ])->assertStatus(422)->assertJsonValidationErrors('code');
    }

    public function test_recovery_code_authenticates_once(): void
    {
        $codes = $this->enrol($this->admin)['recovery_codes'];

        $challenge = $this->postJson('/api/v1/auth/login', [
            'email' => $this->admin->email,
            'password' => 'password',
        ])->json('challenge_token');

        $this->postJson('/api/v1/auth/two-factor/challenge', [
            'challenge_token' => $challenge,
            'code' => $codes[0],
        ])->assertOk()->assertJsonStructure(['token']);

        $challenge = $this->postJson('/api/v1/auth/login', [
            'email' => $this->admin->email,
            'password' => 'password',
        ])->json('challenge_token');

        $this->postJson('/api/v1/auth/two-factor/challenge', [
            'challenge_token' => $challenge,
            'code' => $codes[0],
        ])->assertStatus(422);

        $this->assertCount(7, $this->admin->refresh()->two_factor_recovery_codes);
    }

    public function test_disable_requires_the_password_and_clears_two_factor(): void
    {
        $this->enrol($this->admin);

        $this->api($this->admin)->postJson('/api/v1/auth/two-factor/disable', [
            'password' => 'wrong-password',
        ])->assertStatus(422)->assertJsonValidationErrors('password');

        $this->api($this->admin)->postJson('/api/v1/auth/two-factor/disable', [
            'password' => 'password',
        ])->assertOk()->assertJsonPath('two_factor_enabled', false);

        $user = $this->admin->refresh();
        $this->assertFalse($user->hasTwoFactorEnabled());
        $this->assertNull($user->two_factor_secret);

        $this->postJson('/api/v1/auth/login', [
            'email' => $this->admin->email,
            'password' => 'password',
        ])->assertOk()->assertJsonStructure(['token']);
    }

    public function test_recovery_codes_can_be_regenerated_with_the_password(): void
    {
        $this->enrol($this->admin);

        $this->api($this->admin)->postJson('/api/v1/auth/two-factor/recovery-codes', [
            'password' => 'wrong-password',
        ])->assertStatus(422);

        $response = $this->api($this->admin)->postJson('/api/v1/auth/two-factor/recovery-codes', [
            'password' => 'password',
        ])->assertOk()->assertJsonCount(8, 'recovery_codes');

        $stored = $this->admin->refresh()->two_factor_recovery_codes;
        $this->assertCount(8, $stored);

        foreach ($response->json('recovery_codes') as $index => $plain) {
            $this->assertTrue(Hash::check($plain, $stored[$index]));
        }
    }

    /**
     * @return array{secret: string, otpauth_url: string, recovery_codes: array<int, string>}
     */
    private function enrol(User $user): array
    {
        $service = app(TwoFactorService::class);
        $payload = $service->beginEnrolment($user);
        $service->confirmEnrolment($user, $this->code($payload['secret']));

        return $payload;
    }

    private function code(string $secret): string
    {
        $totp = app(Totp::class);

        return $totp->code($secret, $totp->currentCounter());
    }

    private function api(User $user): self
    {
        $this->app['auth']->forgetGuards();

        $this->withToken($user->createToken('t')->plainTextToken);

        return $this;
    }
}
