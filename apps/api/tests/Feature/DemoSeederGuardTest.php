<?php

namespace Tests\Feature;

use App\Models\Institution;
use App\Models\User;
use Database\Seeders\DemoSeeder;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoSeederGuardTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_seeder_is_skipped_in_production(): void
    {
        $this->app['env'] = 'production';
        config(['security.seed_demo_data' => false]);

        app(DemoSeeder::class)->run();

        $this->assertSame(0, User::query()->where('email', 'like', '%@demo-eis.test')->count());
        $this->assertSame(0, Institution::query()->where('code', 'DEMO-TRUST')->count());
    }

    public function test_demo_seeder_can_be_forced_with_the_opt_in_flag(): void
    {
        $this->app['env'] = 'production';
        config(['security.seed_demo_data' => true]);

        app(RbacSeeder::class)->run();
        app(DemoSeeder::class)->run();

        $this->assertTrue(
            Institution::query()->where('code', 'DEMO-TRUST')->exists()
        );
        $this->assertTrue(
            User::query()->where('email', 'superadmin@demo-eis.test')->exists()
        );
    }
}
