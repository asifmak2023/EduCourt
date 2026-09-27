<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Two-factor authentication enforcement
    |--------------------------------------------------------------------------
    |
    | When disabled, roles that require 2FA can still sign in (useful during a
    | staged rollout). Enable this to require the admin, finance and HR roles to
    | complete authenticator enrolment before they can log in. Users who have
    | already enabled 2FA are always challenged for a code, regardless of this
    | flag.
    |
    */

    'enforce_two_factor' => env('ENFORCE_TWO_FACTOR', false),

    /*
    |--------------------------------------------------------------------------
    | Two-factor authentication (TOTP)
    |--------------------------------------------------------------------------
    |
    | Native RFC 6238 settings used for authenticator enrolment and login
    | challenges. `challenge_ttl` is how long (seconds) a pending login
    | challenge stays valid between the password check and the code check.
    |
    */

    'two_factor' => [
        'issuer' => env('TWO_FACTOR_ISSUER', env('APP_NAME', 'EduCourt')),
        'digits' => 6,
        'period' => 30,
        'window' => 1,
        'recovery_codes' => 8,
        'challenge_ttl' => (int) env('TWO_FACTOR_CHALLENGE_TTL', 300),
    ],

    /*
    |--------------------------------------------------------------------------
    | Public web application URL
    |--------------------------------------------------------------------------
    |
    | Used to build password reset and email verification links that point to
    | the web client rather than the API host.
    |
    */

    'frontend_url' => env('FRONTEND_URL', env('APP_URL', 'http://localhost:3000')),

    /*
    |--------------------------------------------------------------------------
    | Upload malware scanning
    |--------------------------------------------------------------------------
    |
    | Driver "null" skips scanning (development default). Set UPLOAD_SCANNER to
    | "clamav" to scan every uploaded document with ClamAV before it is stored.
    |
    */

    'uploads' => [
        'scanner' => env('UPLOAD_SCANNER', 'null'),
        'clamav_binary' => env('CLAMAV_BINARY', 'clamdscan'),
        'scan_timeout' => (int) env('UPLOAD_SCAN_TIMEOUT', 30),
    ],

];
