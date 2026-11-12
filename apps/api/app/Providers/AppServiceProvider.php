<?php

namespace App\Providers;

use App\Services\Files\ClamavFileScanner;
use App\Services\Files\FileScanner;
use App\Services\Files\NullFileScanner;
use App\Services\Files\StrictFileScanner;
use App\Services\Notifications\NotificationGateway;
use App\Services\Notifications\NotificationService;
use App\Services\Reminders\ReminderGateway;
use App\Services\Reminders\ReminderService;
use App\Services\Sso\HttpOidcClient;
use App\Services\Sso\OidcClient;
use App\Support\TenantContext;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Console\Events\CommandStarting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(TenantContext::class, fn () => new TenantContext);
        $this->app->bind(ReminderGateway::class, fn () => ReminderService::makeGateway());
        $this->app->bind(NotificationGateway::class, fn () => NotificationService::makeGateway());
        $this->app->bind(OidcClient::class, fn () => new HttpOidcClient);
        $this->app->bind(FileScanner::class, fn () => match (config('security.uploads.scanner')) {
            'clamav' => new StrictFileScanner(engine: new ClamavFileScanner),
            'off', 'none' => new NullFileScanner,
            default => new StrictFileScanner,
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

        // Meta webhooks arrive in bursts and are retried aggressively. A tight
        // per-IP limit would cause Meta to back off and drop delivery receipts,
        // so allow a higher ceiling; signature verification still protects them.
        RateLimiter::for('whatsapp-webhook', function (Request $request) {
            return Limit::perMinute(600)->by($request->ip());
        });

        $this->guardDestructiveMigrations();
    }

    /**
     * Refuse destructive schema commands against anything that is not clearly a
     * disposable test database.
     *
     * A stale `bootstrap/cache/config.php` can pin the connection to a
     * production database and silently ignore shell-level DB_* overrides. If a
     * `migrate:fresh` / `migrate:refresh` then runs it will DROP every table.
     * This guard reads the *resolved* connection (not the raw env) so it sees
     * through that stale cache and aborts before touching a live database.
     */
    private function guardDestructiveMigrations(): void
    {
        Event::listen(CommandStarting::class, function (CommandStarting $event): void {
            $command = $event->command ?? '';

            if (! in_array($command, ['migrate:fresh', 'migrate:refresh', 'db:wipe'], true)) {
                return;
            }

            $connection = (string) config('database.default');
            $database = (string) config("database.connections.{$connection}.database");
            $environment = (string) config('app.env');

            if ($this->isDisposableDatabase($database, $environment)) {
                return;
            }

            throw new RuntimeException(sprintf(
                'Refusing to run [%s] against database [%s] (connection [%s], APP_ENV [%s]). '
                .'Destructive migration commands may only run against a disposable test database '
                .'(name containing "test", or APP_ENV=testing). Clear a stale config cache with '
                .'`php artisan config:clear` if this is targeting the wrong database.',
                $command,
                $database,
                $connection,
                $environment,
            ));
        });
    }

    private function isDisposableDatabase(string $database, string $environment): bool
    {
        if ($database === '' || $database === ':memory:') {
            // In-memory sqlite is disposable by definition.
            return true;
        }

        // MySQL's own system databases are never disposable.
        if (in_array(strtolower($database), ['mysql', 'information_schema', 'performance_schema', 'sys'], true)) {
            return false;
        }

        if ($environment === 'testing') {
            return true;
        }

        return str_contains(strtolower($database), 'test');
    }
}
