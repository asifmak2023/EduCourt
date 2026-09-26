<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Fee reminder delivery gateway
    |--------------------------------------------------------------------------
    |
    | The default "log" driver records reminders in the Laravel log so the
    | feature works without an SMTP/SMS provider. Swap this for a real driver
    | (e.g. "mail") once a transport is configured.
    |
    */

    'gateway' => env('REMINDER_GATEWAY', 'log'),

    /*
    |--------------------------------------------------------------------------
    | Default reminder channel
    |--------------------------------------------------------------------------
    |
    | email, sms or in_app. The channel is used to pick the recipient contact
    | from the student's primary guardian when one is not supplied explicitly.
    |
    */

    'channel' => env('REMINDER_CHANNEL', 'email'),

    /*
    |--------------------------------------------------------------------------
    | Message template
    |--------------------------------------------------------------------------
    |
    | Available placeholders: {student}, {admission_no}, {outstanding},
    | {oldest_due_date}, {days_overdue}, {campus}.
    |
    */

    'message_template' => env(
        'REMINDER_MESSAGE_TEMPLATE',
        'Dear {student} guardian, our records show an outstanding fee balance of '
        .'{outstanding} for {student} ({admission_no}). The oldest unpaid amount '
        .'was due on {oldest_due_date} ({days_overdue} days ago). Please settle '
        .'this at your earliest convenience. - {campus}'
    ),

];
