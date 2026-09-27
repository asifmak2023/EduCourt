<?php

namespace App\Services\Sso;

use App\Models\SsoProvider;

/**
 * Pluggable OIDC client so the authorization-code exchange can be faked in
 * tests or swapped for a different identity protocol.
 */
interface OidcClient
{
    public function authorizationUrl(
        SsoProvider $provider,
        string $state,
        string $nonce,
        string $codeChallenge,
        string $redirectUri,
    ): string;

    /**
     * @return array<string, mixed> Token response (access_token, id_token, ...).
     */
    public function exchangeCode(
        SsoProvider $provider,
        string $code,
        string $redirectUri,
        string $codeVerifier,
    ): array;

    /**
     * @return array<string, mixed> Standard OIDC userinfo claims.
     */
    public function userInfo(SsoProvider $provider, string $accessToken): array;

    public function logoutUrl(SsoProvider $provider, ?string $idToken, string $postLogoutRedirect): ?string;
}
