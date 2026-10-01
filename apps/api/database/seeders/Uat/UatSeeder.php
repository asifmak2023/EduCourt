<?php

namespace Database\Seeders\Uat;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * UAT data orchestrator. Builds the 3-institution / 10-campus tenant skeleton
 * and, for every campus, runs each domain seeder so testers have realistic
 * data and a working login for every role.
 *
 * Usage:
 *   php artisan db:seed --class="Database\Seeders\Uat\UatSeeder"
 *
 * The seeder is additive and idempotent: it never deletes existing data and
 * can be re-run safely against an existing database.
 */
class UatSeeder extends Seeder
{
    public function run(): void
    {
        $this->command?->info('UAT: ===== starting UAT dataset seeding =====');

        $foundation = (new UatFoundationSeeder())->withCommand($this->command);
        $foundationData = $foundation->seed();

        $platformAdmin = $foundationData['platform_admin'];
        $campuses = 0;
        $only = $this->onlyCampuses();

        foreach ($foundationData['tenants'] as $tenant) {
            $institution = $tenant['institution'];

            foreach ($tenant['campuses'] as $campus) {
                if ($only !== [] && ! in_array(strtoupper((string) $campus->code), $only, true)) {
                    continue;
                }

                $campuses++;

                $ctx = new UatCampusContext($institution, $campus);
                $ctx->platformAdmin = $platformAdmin;
                $ctx->campusAdmin = $this->campusAdmin($campus, $platformAdmin);

                $this->command?->info(sprintf(
                    'UAT: --- seeding %s (%s) [%d/%d] ---',
                    $campus->name,
                    $campus->code,
                    $campuses,
                    $this->selectedCampusCount($foundationData['tenants'], $only)
                ));

                foreach ($this->domainSeeders() as $seederClass) {
                    (new $seederClass())->withCommand($this->command)->seed($ctx);
                }
            }
        }

        $this->command?->info(sprintf(
            'UAT: ===== done: %d institutions, %d campuses =====',
            count($foundationData['tenants']),
            $campuses
        ));
    }

    /**
     * Domain seeders in dependency order.
     *
     * @return array<int, class-string<UatSeederBase>>
     */
    protected function domainSeeders(): array
    {
        return [
            UatOrgSeeder::class,
            UatAcademicsSeeder::class,
            UatStudentsSeeder::class,
            UatExamsSeeder::class,
            UatAttendanceSeeder::class,
            UatAdmissionsSeeder::class,
            UatFinanceSeeder::class,
            UatOperationsSeeder::class,
            UatStudentLifeSeeder::class,
            UatSupportSeeder::class,
            UatCommunicationSeeder::class,
            UatGovernanceSeeder::class,
        ];
    }

    /**
     * @param  array<int, array{institution: \App\Models\Institution, campuses: array<int, \App\Models\Campus>}>  $tenants
     * @param  array<int, string>  $only
     */
    protected function selectedCampusCount(array $tenants, array $only): int
    {
        return array_sum(array_map(static function (array $tenant) use ($only): int {
            if ($only === []) {
                return count($tenant['campuses']);
            }

            return count(array_filter(
                $tenant['campuses'],
                static fn (\App\Models\Campus $campus): bool => in_array(strtoupper((string) $campus->code), $only, true)
            ));
        }, $tenants));
    }

    /**
     * Optional comma-separated campus-code filter for faster local runs,
     * e.g. UAT_CAMPUSES=ALN-LHR. Defaults to every campus.
     *
     * @return array<int, string>
     */
    protected function onlyCampuses(): array
    {
        $raw = (string) env('UAT_CAMPUSES', '');

        return array_values(array_filter(array_map(
            static fn (string $code): string => strtoupper(trim($code)),
            explode(',', $raw)
        )));
    }

    protected function campusAdmin(\App\Models\Campus $campus, User $grantedBy): User
    {
        $email = 'campusadmin.'.strtolower($campus->code).'@'.UatFoundationSeeder::EMAIL_DOMAIN;

        return User::query()->where('email', $email)->firstOrFail();
    }
}
