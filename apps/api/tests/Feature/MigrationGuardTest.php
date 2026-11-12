<?php

namespace Tests\Feature;

use Illuminate\Console\Events\CommandStarting;
use RuntimeException;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\NullOutput;
use Tests\TestCase;

/**
 * The destructive-migration guard exists because a stale config cache can pin
 * the connection to a production database and make `migrate:fresh` drop every
 * table. These tests assert the guard aborts against non-disposable databases
 * and allows clearly disposable ones.
 */
class MigrationGuardTest extends TestCase
{
    private function fire(string $command, string $database, string $environment): void
    {
        config([
            'database.default' => 'mysql',
            'database.connections.mysql.database' => $database,
            'app.env' => $environment,
        ]);

        event(new CommandStarting($command, new ArrayInput([]), new NullOutput));
    }

    public function test_it_refuses_migrate_fresh_against_a_production_database(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Refusing to run [migrate:fresh]');

        $this->fire('migrate:fresh', 'educourt', 'production');
    }

    public function test_it_refuses_db_wipe_against_a_production_database(): void
    {
        $this->expectException(RuntimeException::class);

        $this->fire('db:wipe', 'educourt', 'production');
    }

    public function test_it_refuses_against_system_databases(): void
    {
        $this->expectException(RuntimeException::class);

        $this->fire('migrate:fresh', 'information_schema', 'testing');
    }

    public function test_it_allows_a_database_whose_name_contains_test(): void
    {
        $this->fire('migrate:fresh', 'educourt_testing', 'production');

        $this->assertTrue(true);
    }

    public function test_it_allows_the_testing_environment(): void
    {
        $this->fire('migrate:fresh', 'whatever', 'testing');

        $this->assertTrue(true);
    }

    public function test_it_allows_in_memory_sqlite(): void
    {
        $this->fire('migrate:fresh', ':memory:', 'production');

        $this->assertTrue(true);
    }

    public function test_it_ignores_non_destructive_commands(): void
    {
        $this->fire('migrate', 'educourt', 'production');

        $this->assertTrue(true);
    }
}
