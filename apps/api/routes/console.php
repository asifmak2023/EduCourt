<?php

use App\Models\WhatsAppSender;
use App\Services\WhatsApp\SenderTokenService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
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
