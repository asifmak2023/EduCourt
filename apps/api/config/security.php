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

];
