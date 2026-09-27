<?php

namespace App\Services\Sso;

use App\Models\SsoProvider;
use Illuminate\Support\Facades\Http;

/**
 * Standard OIDC authorization-code client using Laravel's HTTP client.
 */
class HttpOidcClient implements OidcClient
{
    public function authorizationUrl(
        SsoProvider $provider,
        string $state,
        string $nonce,
        string $codeChallenge,
        string $redirectUri,
    ): string {
        return $provider->authorize_url.'?'.http_build_query([
            'response_type' => 'code',
            'client_id' => $provider->client_id,
            'redirect_uri' => $redirectUri,
            'scope' => $provider->scopes,
            'state' => $state,
            'nonce' => $nonce,
            'code_challenge' => $codeChallenge,
            'code_challenge_method' => 'S256',
        ], '', '&', PHP_QUERY_RFC3986);
    }

    public function exchangeCode(
        SsoProvider $provider,
        string $code,
        string $redirectUri,
        string $codeVerifier,
    ): array {
        return Http::asForm()
            ->timeout((int) config('sso.http_timeout'))
            ->post($provider->token_url, [
                'grant_type' => 'authorization_code',
                'code' => $code,
                'redirect_uri' => $redirectUri,
                'client_id' => $provider->client_id,
                'client_secret' => $provider->client_secret,
                'code_verifier' => $codeVerifier,
            ])
            ->throw()
            ->json() ?? [];
    }

    public function userInfo(SsoProvider $provider, string $accessToken): array
    {
        return Http::withToken($accessToken)
            ->timeout((int) config('sso.http_timeout'))
            ->acceptJson()
            ->get($provider->userinfo_url)
            ->throw()
            ->json() ?? [];
    }

    public function logoutUrl(SsoProvider $provider, ?string $idToken, string $postLogoutRedirect): ?string
    {
        if ($provider->logout_url === null) {
            return null;
        }

        return $provider->logout_url.'?'.http_build_query(array_filter([
            'id_token_hint' => $idToken,
            'post_logout_redirect_uri' => $postLogoutRedirect,
        ]), '', '&', PHP_QUERY_RFC3986);
    }
}
