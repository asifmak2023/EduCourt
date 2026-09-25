<?php

namespace Tests\Feature;

use App\Enums\RoleName;
use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);
    }

    public function test_user_can_login_with_valid_credentials(): void
    {
        $user = User::factory()->create(['password' => 'secret-password']);
        $user->syncRoles([RoleName::CampusAdmin->value]);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'secret-password',
        ])
            ->assertOk()
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'name', 'email', 'roles', 'permissions'],
            ]);
    }

    public function test_login_fails_with_invalid_password(): void
    {
        $user = User::factory()->create(['password' => 'secret-password']);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ])->assertStatus(422);
    }

    public function test_inactive_user_cannot_login(): void
    {
        $user = User::factory()->create([
            'password' => 'secret-password',
            'is_active' => false,
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'secret-password',
        ])->assertStatus(403);
    }

    public function test_finance_role_requires_two_factor_setup(): void
    {
        config()->set('security.enforce_two_factor', true);

        $user = User::factory()->create(['password' => 'secret-password']);
        $user->syncRoles([RoleName::FinanceHead->value]);

        $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'secret-password',
        ])
            ->assertStatus(409)
            ->assertJsonPath('two_factor_setup_required', true);
    }

    public function test_authenticated_user_can_fetch_profile(): void
    {
        $user = User::factory()->create();
        $user->syncRoles([RoleName::Teacher->value]);
        $token = $user->createToken('test')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.id', $user->id);
    }

    public function test_security_headers_are_present(): void
    {
        $this->getJson('/api/v1/auth/me')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY');
    }

    public function test_unauthenticated_request_returns_json_401(): void
    {
        $this->withHeaders(['Accept' => 'text/html'])
            ->get('/api/v1/auth/me')
            ->assertStatus(401)
            ->assertHeader('Content-Type', 'application/json');
    }

    public function test_password_reset_link_can_be_requested(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])
            ->assertOk();

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_password_can_be_reset_with_a_valid_token(): void
    {
        $user = User::factory()->create(['password' => 'old-password']);
        $token = Password::broker()->createToken($user);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])->assertOk();

        $this->assertTrue(Hash::check('new-password-123', $user->refresh()->password));
    }

    public function test_password_reset_fails_with_an_invalid_token(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => $user->email,
            'token' => 'not-a-real-token',
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_email_can_be_verified_from_a_signed_link(): void
    {
        $user = User::factory()->unverified()->create();

        $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
            'id' => $user->id,
            'hash' => sha1($user->email),
        ]);

        $this->getJson($url)->assertOk();

        $this->assertTrue($user->refresh()->hasVerifiedEmail());
    }

    public function test_verification_notification_requires_authentication(): void
    {
        $this->postJson('/api/v1/auth/email/verification-notification')->assertStatus(401);
    }

    public function test_sessions_can_be_listed_and_revoked(): void
    {
        $user = User::factory()->create();
        $first = $user->createToken('laptop');
        $second = $user->createToken('phone');

        $this->asToken($second->plainTextToken)
            ->getJson('/api/v1/auth/tokens')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonFragment(['id' => $second->accessToken->id, 'is_current' => true]);

        $this->asToken($second->plainTextToken)
            ->deleteJson("/api/v1/auth/tokens/{$first->accessToken->id}")
            ->assertOk();

        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $first->accessToken->id]);

        $this->asToken($second->plainTextToken)
            ->deleteJson('/api/v1/auth/tokens')
            ->assertOk()
            ->assertJsonPath('revoked', 0);
    }

    public function test_password_can_be_changed_and_other_sessions_revoked(): void
    {
        $user = User::factory()->create(['password' => 'current-password']);
        $current = $user->createToken('current');
        $other = $user->createToken('other');

        $this->asToken($current->plainTextToken)->putJson('/api/v1/auth/password', [
            'current_password' => 'current-password',
            'password' => 'brand-new-password',
            'password_confirmation' => 'brand-new-password',
        ])->assertOk();

        $this->assertTrue(Hash::check('brand-new-password', $user->refresh()->password));
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $other->accessToken->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $current->accessToken->id]);
    }

    public function test_password_change_rejects_wrong_current_password(): void
    {
        $user = User::factory()->create(['password' => 'current-password']);
        $token = $user->createToken('current');

        $this->asToken($token->plainTextToken)->putJson('/api/v1/auth/password', [
            'current_password' => 'wrong-password',
            'password' => 'brand-new-password',
            'password_confirmation' => 'brand-new-password',
        ])->assertStatus(422)->assertJsonValidationErrors('current_password');
    }

    private function asToken(string $token): self
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($token);
    }
}
