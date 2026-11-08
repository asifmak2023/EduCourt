<?php

use App\Models\Institution;
use App\Models\IntegrationPolicy;
use App\Models\MetaAppConnection;
use App\Models\WhatsAppConsent;
use App\Models\WhatsAppSender;
use App\Services\WhatsApp\SenderTokenService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('whatsapp:tokens', function (SenderTokenService $tokens) {
    $expiring = $tokens->expiring();
    $expired = $expiring->filter(fn (WhatsAppSender $sender) => $sender->tokenExpired());
    $unknown = $tokens->unknownExpiry();

    $this->info(sprintf(
        'WhatsApp tokens: %d expiring (of which %d expired), %d with unknown expiry.',
        $expiring->count(),
        $expired->count(),
        $unknown->count(),
    ));

    foreach ($expired as $sender) {
        $this->warn(sprintf(
            'EXPIRED: sender #%d "%s" (institution %s) expired at %s',
            $sender->id,
            $sender->label,
            $sender->owner_institution_id ?? 'platform',
            $sender->token_expires_at?->toDateTimeString() ?? '-',
        ));
    }

    foreach ($unknown as $sender) {
        $this->line(sprintf(
            'UNKNOWN EXPIRY: sender #%d "%s" - set an expiry so rotation can be planned.',
            $sender->id,
            $sender->label,
        ));
    }

    return self::SUCCESS;
})->purpose('Report WhatsApp access tokens that are expired, expiring, or of unknown expiry');

Schedule::command('whatsapp:tokens')->dailyAt('02:00');

/*
 * One-time, reversible bootstrap of the WhatsApp integration tables from the
 * legacy WHATSAPP_* environment variables.
 *
 * Safe to run repeatedly: it creates the default Meta app and a platform-owned
 * sender only when they do not already exist, and never assigns a sender to an
 * institution unless --institution is passed explicitly. No institution is
 * opted in by default, because assignment is a deliberate decision.
 */
Artisan::command('whatsapp:bootstrap {--institution= : Institution id to assign the platform sender to (repeatable-comma-separated)}', function () {
    $token = (string) config('reminders.whatsapp.token');
    $phoneNumberId = (string) config('reminders.whatsapp.phone_number_id');

    if ($token === '' || $phoneNumberId === '') {
        $this->error('WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID are not set; nothing to import.');

        return self::FAILURE;
    }

    $app = MetaAppConnection::query()->firstOrCreate(
        ['app_key' => 'default'],
        [
            'app_id' => (string) (getenv('WHATSAPP_APP_ID') ?: 'unknown'),
            'app_secret' => (string) (getenv('WHATSAPP_APP_SECRET') ?: 'unknown'),
            'verify_token' => (string) (getenv('WHATSAPP_VERIFY_TOKEN') ?: 'unknown'),
            'is_active' => true,
        ],
    );

    $sender = WhatsAppSender::query()
        ->where('owner_institution_id', null)
        ->where('phone_number_id', $phoneNumberId)
        ->first();

    if ($sender === null) {
        $sender = WhatsAppSender::create([
            'owner_institution_id' => null,
            'meta_app_connection_id' => $app->id,
            'managed_by' => 'platform',
            'label' => 'Platform WhatsApp number',
            'connection_mode' => 'platform_managed',
            'phone_number_id' => $phoneNumberId,
            'business_account_id' => (string) (getenv('WHATSAPP_BUSINESS_ACCOUNT_ID') ?: null),
            'display_phone_number' => null,
            'access_token' => $token,
            'token_expiry_mode' => 'unknown',
            'default_country_code' => (string) config('reminders.whatsapp.default_country_code', '92'),
            'is_active' => true,
        ]);

        $this->info("Created platform sender #{$sender->id} for phone number id {$phoneNumberId}.");
    } else {
        $this->info("Platform sender #{$sender->id} already exists; leaving it unchanged.");
    }

    $ids = array_filter(array_map('intval', explode(',', (string) $this->option('institution'))));

    foreach ($ids as $institutionId) {
        $institution = Institution::query()->find($institutionId);

        if ($institution === null) {
            $this->warn("Institution #{$institutionId} not found; skipped.");

            continue;
        }

        IntegrationPolicy::updateOrCreate(
            ['institution_id' => $institution->id],
            [
                'whatsapp_allowed' => true,
                'whatsapp_self_service' => false,
                'whatsapp_sender_id' => $sender->id,
            ],
        );

        $this->info("Assigned the platform sender to institution #{$institution->id} ({$institution->name}).");
    }

    if ($ids === []) {
        $this->line('No institution assigned. Pass --institution=<id> to opt one in explicitly.');
    }

    return self::SUCCESS;
})->purpose('Import legacy WHATSAPP_* env credentials into meta_app_connections and whatsapp_senders');

/*
 * Evidence-based guardian consent import.
 *
 * Absence of evidence is never treated as consent. Only phone numbers listed
 * in the evidence file are marked opted_in; everything else stays pending and
 * remains blocked.
 */
Artisan::command('whatsapp:import-consent
    {institution : Institution id}
    {--business-account= : WABA id to scope consent to}
    {--category=utility : Message category}
    {--file= : CSV of phone numbers with documented consent}
    {--source=import_evidence : Consent source label}', function () {
    $institutionId = (int) $this->argument('institution');
    $institution = Institution::query()->find($institutionId);

    if ($institution === null) {
        $this->error("Institution #{$institutionId} not found.");

        return self::FAILURE;
    }

    $businessAccountId = (string) $this->option('business-account');
    $file = (string) $this->option('file');

    if ($businessAccountId === '') {
        $policy = IntegrationPolicy::query()->where('institution_id', $institutionId)->first();
        $businessAccountId = (string) ($policy?->whatsappSender?->business_account_id ?? '');
    }

    if ($businessAccountId === '') {
        $this->error('No business account id supplied and none is assigned to this institution.');

        return self::FAILURE;
    }

    if ($file === '' || ! is_file($file)) {
        $this->error('Provide --file with a CSV of phone numbers that have documented consent.');

        return self::FAILURE;
    }

    $rows = array_map('str_getcsv', file($file) ?: []);
    $header = $rows[0] ?? [];
    $phoneColumn = 0;

    foreach ($header as $index => $column) {
        if (in_array(strtolower(trim((string) $column)), ['phone', 'whatsapp', 'number'], true)) {
            $phoneColumn = $index;

            break;
        }
    }

    $imported = 0;
    $skipped = 0;

    DB::transaction(function () use ($rows, $phoneColumn, $institutionId, $businessAccountId, &$imported, &$skipped) {
        foreach ($rows as $index => $row) {
            if ($index === 0 && $phoneColumn >= 0) {
                continue;
            }

            $raw = (string) ($row[$phoneColumn] ?? '');
            $phone = WhatsAppConsent::normalisePhone($raw);

            if ($phone === null) {
                $skipped++;

                continue;
            }

            WhatsAppConsent::updateOrCreate(
                [
                    'institution_id' => $institutionId,
                    'business_account_id' => $businessAccountId,
                    'phone' => $phone,
                    'message_category' => (string) $this->option('category'),
                ],
                [
                    'status' => 'opted_in',
                    'source' => (string) $this->option('source'),
                    'opted_in_at' => now(),
                ],
            );

            $imported++;
        }
    });

    $this->info("Imported {$imported} consent record(s); skipped {$skipped} invalid number(s).");
    $this->line('Numbers without evidence remain pending and are still blocked.');

    return self::SUCCESS;
})->purpose('Import guardian WhatsApp consent evidence; unlisted numbers stay pending');
