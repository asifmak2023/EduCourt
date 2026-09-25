<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Online payment gateways
    |--------------------------------------------------------------------------
    |
    | The default gateway handles checkout initiation. Each entry maps a name
    | to a driver class. Webhooks are verified with the shared webhook secret
    | using an HMAC-SHA256 signature of the raw request body.
    |
    */

    'default' => env('PAYMENT_GATEWAY', 'manual'),

    'webhook_secret' => env('PAYMENT_WEBHOOK_SECRET'),

    'currency' => env('PAYMENT_CURRENCY', 'PKR'),

    'gateways' => [
        'manual' => [
            'driver' => 'manual',
            'checkout_url' => env('PAYMENT_MANUAL_CHECKOUT_URL', 'https://payments.example.test/checkout'),
        ],
    ],

];
