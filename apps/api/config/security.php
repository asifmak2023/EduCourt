<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Two-factor authentication enforcement
    |--------------------------------------------------------------------------
    |
    | When disabled, roles that require 2FA can still sign in (useful before the
    | enrolment flow is available). Enable this once 2FA setup is shipped so the
    | admin, finance and HR roles must complete enrolment before logging in.
    |
    */

    'enforce_two_factor' => env('ENFORCE_TWO_FACTOR', false),

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
