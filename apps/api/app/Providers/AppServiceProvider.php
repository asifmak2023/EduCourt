<?php

namespace App\Providers;

use App\Services\Files\ClamavFileScanner;
use App\Services\Files\FileScanner;
use App\Services\Files\NullFileScanner;
use App\Services\Notifications\NotificationGateway;
use App\Services\Notifications\NotificationService;
use App\Services\Reminders\ReminderGateway;
use App\Services\Reminders\ReminderService;
use App\Support\TenantContext;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(TenantContext::class, fn () => new TenantContext);
        $this->app->bind(ReminderGateway::class, fn () => ReminderService::makeGateway());
        $this->app->bind(NotificationGateway::class, fn () => NotificationService::makeGateway());
        $this->app->bind(FileScanner::class, fn () => match (config('security.uploads.scanner')) {
            'clamav' => new ClamavFileScanner,
            default => new NullFileScanner,
        });
    }

    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('login', function (Request $request) {
            $key = Str::transliterate(Str::lower($request->input('email')).'|'.$request->ip());

            return Limit::perMinute(5)->by($key)->response(function () {
                return response()->json([
                    'message' => 'Too many login attempts. Please try again later.',
                ], 429);
            });
        });

        RateLimiter::for('sensitive', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });
    }
}
