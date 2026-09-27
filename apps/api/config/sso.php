<?php

return [

    /*
    |--------------------------------------------------------------------------
    | SSO (OIDC) for staff
    |--------------------------------------------------------------------------
    |
    | Each institution stores one or more OIDC providers in the database. The
    | flow is a standard authorization-code flow with PKCE, a state and nonce
    | guard, and optional just-in-time user provisioning. The token exchange and
    | userinfo lookup run through a pluggable client so tests can fake the IdP.
    |
    */

    'state_ttl' => (int) env('SSO_STATE_TTL', 600),

    'http_timeout' => (int) env('SSO_HTTP_TIMEOUT', 15),

];
