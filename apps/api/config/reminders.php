<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Fee reminder delivery gateway
    |--------------------------------------------------------------------------
    |
    | The default "log" driver records reminders in the Laravel log so the
    | feature works without an SMTP/SMS provider. Swap this for a real driver
    | (e.g. "whatsapp" or "mail") once a transport is configured. The "whatsapp"
    | driver only delivers reminders whose channel is "whatsapp"; reminders on
    | other channels fall back to the log driver.
    |
    */

    'gateway' => env('REMINDER_GATEWAY', 'log'),

    /*
    |--------------------------------------------------------------------------
    | Default reminder channel
    |--------------------------------------------------------------------------
    |
    | email, sms, whatsapp or in_app. The channel is used to pick the recipient
    | contact from the student's primary guardian when one is not supplied
    | explicitly.
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

    /*
    |--------------------------------------------------------------------------
    | WhatsApp Cloud API
    |--------------------------------------------------------------------------
    |
    | Used by the "whatsapp" reminder gateway. Create a Meta WhatsApp Business
    | app, then set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID. The default
    | country code is prepended to national numbers that do not already start
    | with it (e.g. "3001234567" with country code "92" -> "923001234567").
    |
    */

    'whatsapp' => [
        'token' => env('WHATSAPP_TOKEN'),
        'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
        'base_url' => env('WHATSAPP_BASE_URL', 'https://graph.facebook.com/v21.0'),
        'timeout' => (int) env('WHATSAPP_TIMEOUT', 15),
        'default_country_code' => env('WHATSAPP_DEFAULT_COUNTRY_CODE', '92'),
    ],

];
