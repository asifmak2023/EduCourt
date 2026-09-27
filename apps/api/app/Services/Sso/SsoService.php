<?php

namespace App\Services\Sso;

use App\Models\SsoIdentity;
use App\Models\SsoProvider;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Drives the OIDC authorization-code flow for staff: state/nonce/PKCE handling,
 * account linking by external subject or email, and optional just-in-time
 * user provisioning.
 */
class SsoService
{
    public function __construct(private readonly OidcClient $client) {}

    /**
     * @return array{authorization_url: string, state: string}
     */
    public function begin(SsoProvider $provider): array
    {
        if (! $provider->is_active) {
            abort(404, 'This SSO provider is not active.');
        }

        $state = Str::random(40);
        $nonce = Str::random(40);
        $verifier = Str::random(64);
        $challenge = rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');

        Cache::put($this->cacheKey($state), [
            'provider_id' => $provider->id,
            'nonce' => $nonce,
            'verifier' => $verifier,
        ], (int) config('sso.state_ttl'));

        return [
            'authorization_url' => $this->client->authorizationUrl(
                $provider,
                $state,
                $nonce,
                $challenge,
                $provider->redirect_uri,
            ),
            'state' => $state,
        ];
    }

    /**
     * @return array{user: User, token: string, id_token: string|null}
     */
    public function complete(SsoProvider $provider, string $state, string $code, ?string $deviceName = null): array
    {
        if (! $provider->is_active) {
            abort(404, 'This SSO provider is not active.');
        }

        $payload = Cache::pull($this->cacheKey($state));

        if ($payload === null || (int) $payload['provider_id'] !== $provider->id) {
            throw ValidationException::withMessages([
                'state' => 'This sign-in attempt is invalid or has expired. Please start again.',
            ]);
        }

        $tokens = $this->client->exchangeCode($provider, $code, $provider->redirect_uri, $payload['verifier']);
        $accessToken = $tokens['access_token'] ?? null;

        if ($accessToken === null) {
            throw ValidationException::withMessages([
                'code' => 'The identity provider did not return an access token.',
            ]);
        }

        $claims = $this->client->userInfo($provider, $accessToken);

        if (array_key_exists('email_verified', $claims) && ! $claims['email_verified']) {
            abort(403, 'The identity provider has not verified this email address.');
        }

        $email = $claims['email'] ?? null;
        $subject = $claims['sub'] ?? null;

        if ($email === null || $subject === null) {
            throw ValidationException::withMessages([
                'code' => 'The identity provider response is missing the email or subject claim.',
            ]);
        }

        $user = $this->resolveUser($provider, (string) $subject, (string) $email, $claims);

        if (! $user->is_active) {
            abort(403, 'This account is inactive. Contact your administrator.');
        }

        $user->forceFill(['last_login_at' => now()])->save();

        $token = $user->createToken($deviceName ?? 'sso')->plainTextToken;

        activity('auth')
            ->causedBy($user)
            ->withProperties(['provider' => $provider->name, 'subject' => $subject])
            ->log('User logged in via SSO');

        $user->load(['roles', 'permissions', 'campus', 'institution', 'scopeAssignments']);

        return [
            'user' => $user,
            'token' => $token,
            'id_token' => $tokens['id_token'] ?? null,
        ];
    }

    public function logoutUrl(SsoProvider $provider, ?string $idToken, string $postLogoutRedirect): ?string
    {
        return $this->client->logoutUrl($provider, $idToken, $postLogoutRedirect);
    }

    /**
     * @param  array<string, mixed>  $claims
     */
    private function resolveUser(SsoProvider $provider, string $subject, string $email, array $claims): User
    {
        $identity = SsoIdentity::query()
            ->where('sso_provider_id', $provider->id)
            ->where('subject', $subject)
            ->first();

        if ($identity !== null) {
            $identity->forceFill(['email' => $email, 'last_login_at' => now()])->save();

            return $identity->user()->firstOrFail();
        }

        $user = User::query()
            ->withoutGlobalScopes()
            ->where('institution_id', $provider->institution_id)
            ->where('email', $email)
            ->first();

        if ($user === null) {
            if (! $provider->jit_provisioning) {
                abort(403, 'No account is linked to this SSO identity. Ask an administrator to invite you first.');
            }

            $user = $this->provisionUser($provider, $email, $claims);
        }

        SsoIdentity::create([
            'user_id' => $user->id,
            'sso_provider_id' => $provider->id,
            'subject' => $subject,
            'email' => $email,
            'last_login_at' => now(),
        ]);

        return $user;
    }

    /**
     * @param  array<string, mixed>  $claims
     */
    private function provisionUser(SsoProvider $provider, string $email, array $claims): User
    {
        return DB::transaction(function () use ($provider, $email, $claims) {
            $user = User::create([
                'name' => $claims['name'] ?? Str::before($email, '@'),
                'email' => $email,
                'password' => Str::random(48),
                'institution_id' => $provider->institution_id,
                'campus_id' => null,
                'is_active' => true,
                'email_verified_at' => now(),
            ]);

            if ($provider->default_role !== null) {
                $user->syncRoles([$provider->default_role]);
            }

            return $user;
        });
    }

    private function cacheKey(string $state): string
    {
        return 'sso:state:'.$state;
    }
}
