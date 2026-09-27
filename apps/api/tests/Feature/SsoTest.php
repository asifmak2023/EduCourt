<?php

namespace Tests\Feature;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Models\Campus;
use App\Models\Institution;
use App\Models\SsoProvider;
use App\Models\User;
use App\Services\Sso\OidcClient;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class SsoTest extends TestCase
{
    use RefreshDatabase;

    private Institution $institution;

    private Campus $campus;

    private User $admin;

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->institution = Institution::create(['name' => 'Test Trust', 'code' => 'TT']);
        $this->campus = Campus::create([
            'institution_id' => $this->institution->id,
            'name' => 'Campus A', 'code' => 'A', 'type' => CampusType::School->value,
        ]);

        $this->admin = $this->actor(RoleName::CampusAdmin);
        $this->teacher = $this->actor(RoleName::Teacher, 'teacher@test.test');
    }

    public function test_provider_can_be_configured_and_secret_stays_encrypted(): void
    {
        $response = $this->api($this->admin)->postJson('/api/v1/sso-providers', [
            'name' => 'Okta',
            'client_id' => 'client-abc',
            'client_secret' => 'super-secret',
            'authorize_url' => 'https://idp.test/authorize',
            'token_url' => 'https://idp.test/token',
            'userinfo_url' => 'https://idp.test/userinfo',
            'redirect_uri' => 'https://app.test/sso/callback',
            'jit_provisioning' => true,
            'default_role' => 'teacher',
        ])->assertStatus(201)
            ->assertJsonPath('data.name', 'Okta')
            ->assertJsonPath('data.has_client_secret', true)
            ->assertJsonMissingPath('data.client_secret');

        $raw = DB::table('sso_providers')->where('id', $response->json('data.id'))->value('client_secret');
        $this->assertNotSame('super-secret', $raw);
        $this->assertSame('super-secret', SsoProvider::query()->firstOrFail()->client_secret);
    }

    public function test_authorize_and_callback_log_in_a_linked_staff_account(): void
    {
        $provider = $this->provider();
        $this->bindOidc([
            'sub' => 'subject-1',
            'email' => $this->teacher->email,
            'email_verified' => true,
            'name' => 'Teacher One',
        ]);

        $state = $this->getJson("/api/v1/auth/sso/{$provider->id}/authorize")
            ->assertOk()
            ->assertJsonPath('data.state', fn ($value) => is_string($value) && $value !== '')
            ->json('data.state');

        $this->assertStringContainsString('https://idp.test/authorize', $this->getJson("/api/v1/auth/sso/{$provider->id}/authorize")->json('data.authorization_url'));

        $response = $this->postJson("/api/v1/auth/sso/{$provider->id}/callback", [
            'code' => 'auth-code',
            'state' => $state,
        ])->assertOk();

        $this->assertNotEmpty($response->json('token'));
        $this->assertSame($this->teacher->email, $response->json('user.email'));

        $this->assertDatabaseHas('sso_identities', [
            'user_id' => $this->teacher->id,
            'sso_provider_id' => $provider->id,
            'subject' => 'subject-1',
        ]);

        $this->withToken($response->json('token'))
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', $this->teacher->email);
    }

    public function test_unlinked_account_is_rejected_without_jit_then_provisioned_with_it(): void
    {
        $provider = $this->provider(['jit_provisioning' => false]);
        $this->bindOidc([
            'sub' => 'subject-2',
            'email' => 'new.staff@test.test',
            'email_verified' => true,
            'name' => 'New Staff',
        ]);

        $state = $this->getJson("/api/v1/auth/sso/{$provider->id}/authorize")->json('data.state');

        $this->postJson("/api/v1/auth/sso/{$provider->id}/callback", [
            'code' => 'auth-code',
            'state' => $state,
        ])->assertStatus(403);

        $provider->update(['jit_provisioning' => true, 'default_role' => 'teacher']);

        $state = $this->getJson("/api/v1/auth/sso/{$provider->id}/authorize")->json('data.state');

        $this->postJson("/api/v1/auth/sso/{$provider->id}/callback", [
            'code' => 'auth-code',
            'state' => $state,
        ])->assertOk()->assertJsonPath('user.email', 'new.staff@test.test');

        $provisioned = User::query()->where('email', 'new.staff@test.test')->firstOrFail();
        $this->assertTrue($provisioned->hasRole(RoleName::Teacher->value));
    }

    public function test_callback_rejects_an_unknown_state(): void
    {
        $provider = $this->provider();
        $this->bindOidc([
            'sub' => 'subject-3',
            'email' => $this->teacher->email,
            'email_verified' => true,
        ]);

        $this->postJson("/api/v1/auth/sso/{$provider->id}/callback", [
            'code' => 'auth-code',
            'state' => Str::random(40),
        ])->assertStatus(422);
    }

    public function test_provider_configuration_requires_setting_permission(): void
    {
        $this->api($this->teacher)->getJson('/api/v1/sso-providers')->assertStatus(403);
        $this->api($this->teacher)->postJson('/api/v1/sso-providers', [
            'name' => 'Nope',
            'client_id' => 'x',
            'client_secret' => 'y',
            'authorize_url' => 'https://idp.test/authorize',
            'token_url' => 'https://idp.test/token',
            'userinfo_url' => 'https://idp.test/userinfo',
            'redirect_uri' => 'https://app.test/sso/callback',
        ])->assertStatus(403);
    }

    public function test_logout_returns_rp_initiated_url_and_revokes_the_token(): void
    {
        $provider = $this->provider();
        $this->bindOidc([
            'sub' => 'subject-4',
            'email' => $this->teacher->email,
            'email_verified' => true,
        ]);

        $state = $this->getJson("/api/v1/auth/sso/{$provider->id}/authorize")->json('data.state');
        $token = $this->postJson("/api/v1/auth/sso/{$provider->id}/callback", [
            'code' => 'auth-code',
            'state' => $state,
        ])->json('token');

        $this->withToken($token)->postJson("/api/v1/auth/sso/{$provider->id}/logout", [
            'id_token' => 'id-1',
            'post_logout_redirect' => 'https://app.test/logged-out',
        ])->assertOk()->assertJsonPath('logout_url', 'https://idp.test/logout?redirect=https://app.test/logged-out');

        $this->app['auth']->forgetGuards();

        $this->withToken($token)->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function provider(array $overrides = []): SsoProvider
    {
        return SsoProvider::create(array_merge([
            'institution_id' => $this->institution->id,
            'name' => 'Test IdP',
            'provider' => 'oidc',
            'client_id' => 'client-1',
            'client_secret' => 'secret-1',
            'authorize_url' => 'https://idp.test/authorize',
            'token_url' => 'https://idp.test/token',
            'userinfo_url' => 'https://idp.test/userinfo',
            'logout_url' => 'https://idp.test/logout',
            'redirect_uri' => 'https://app.test/sso/callback',
            'scopes' => 'openid email profile',
            'is_active' => true,
            'jit_provisioning' => false,
        ], $overrides));
    }

    /**
     * @param  array<string, mixed>  $claims
     */
    private function bindOidc(array $claims): void
    {
        $this->app->instance(OidcClient::class, new class($claims) implements OidcClient
        {
            /** @param array<string, mixed> $claims */
            public function __construct(private array $claims) {}

            public function authorizationUrl(SsoProvider $provider, string $state, string $nonce, string $codeChallenge, string $redirectUri): string
            {
                return $provider->authorize_url.'?state='.$state.'&nonce='.$nonce;
            }

            public function exchangeCode(SsoProvider $provider, string $code, string $redirectUri, string $codeVerifier): array
            {
                return ['access_token' => 'access-1', 'id_token' => 'id-1'];
            }

            public function userInfo(SsoProvider $provider, string $accessToken): array
            {
                return $this->claims;
            }

            public function logoutUrl(SsoProvider $provider, ?string $idToken, string $postLogoutRedirect): ?string
            {
                return 'https://idp.test/logout?redirect='.$postLogoutRedirect;
            }
        });
    }

    private function actor(RoleName $role, ?string $email = null): User
    {
        $user = User::factory()->create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'email' => $email ?? Str::lower($role->value).'@test.test',
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
