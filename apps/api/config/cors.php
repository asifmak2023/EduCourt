<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('FRONTEND_URL', 'http://localhost:3000'))
    ))),

    'allowed_origins_patterns' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env(
            'FRONTEND_URL_PATTERNS',
            '#^https://[a-z0-9-]+\.monkeycode-ai\.live$#'
        ))
    ))),

    'allowed_headers' => [
        'Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-Campus-Id',
    ],

    'exposed_headers' => [],

    'max_age' => 3600,

    'supports_credentials' => false,

];
