<?php

namespace Database\Seeders\Uat;

use App\Enums\CampusType;
use App\Enums\RoleName;
use App\Enums\ScopeType;
use App\Models\Campus;
use App\Models\Institution;
use App\Models\ScopeAssignment;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

/**
 * Creates the UAT tenant skeleton: 3 institutions, 10 campuses, the platform
 * Super Admin and one Campus Admin per campus. Everything is additive and
 * idempotent so it can run against an existing production database.
 */
class UatFoundationSeeder extends UatSeederBase
{
    public const EMAIL_DOMAIN = 'uat.educourt.test';

    public const PASSWORD = 'Password@123';

    /**
     * Logical institute / campus fixtures.
     *
     * @return array<int, array{
     *     name: string, code: string, plan: string, type: string,
     *     email: string, website: string, address: string,
     *     campuses: array<int, array{name: string, code: string, city: string}>
     * }>
     */
    public static function fixtures(): array
    {
        return [
            [
                'name' => 'Al-Noor Education Foundation',
                'code' => 'ALNOOR',
                'plan' => 'standard',
                'type' => CampusType::School->value,
                'email' => 'info@alnoor.edu.pk',
                'website' => 'https://alnoor.edu.pk',
                'address' => '12 Main Boulevard, Gulberg III, Lahore',
                'campuses' => [
                    ['name' => 'Al-Noor Lahore Campus', 'code' => 'ALN-LHR', 'city' => 'Lahore'],
                    ['name' => 'Al-Noor Karachi Campus', 'code' => 'ALN-KHI', 'city' => 'Karachi'],
                    ['name' => 'Al-Noor Islamabad Campus', 'code' => 'ALN-ISB', 'city' => 'Islamabad'],
                    ['name' => 'Al-Noor Faisalabad Campus', 'code' => 'ALN-FSD', 'city' => 'Faisalabad'],
                ],
            ],
            [
                'name' => 'Riverside Group of Colleges',
                'code' => 'RIVERSIDE',
                'plan' => 'premium',
                'type' => CampusType::College->value,
                'email' => 'info@riverside.edu.pk',
                'website' => 'https://riverside.edu.pk',
                'address' => '45 Airport Road, Rawalpindi',
                'campuses' => [
                    ['name' => 'Riverside Rawalpindi Campus', 'code' => 'RIV-RWP', 'city' => 'Rawalpindi'],
                    ['name' => 'Riverside Peshawar Campus', 'code' => 'RIV-PSH', 'city' => 'Peshawar'],
                    ['name' => 'Riverside Multan Campus', 'code' => 'RIV-MUX', 'city' => 'Multan'],
                ],
            ],
            [
                'name' => 'National University of Applied Sciences',
                'code' => 'NUAS',
                'plan' => 'enterprise',
                'type' => CampusType::University->value,
                'email' => 'registrar@nuas.edu.pk',
                'website' => 'https://nuas.edu.pk',
                'address' => 'Sector H-9, Islamabad',
                'campuses' => [
                    ['name' => 'NUAS Islamabad Campus', 'code' => 'NUAS-ISB', 'city' => 'Islamabad'],
                    ['name' => 'NUAS Lahore Campus', 'code' => 'NUAS-LHR', 'city' => 'Lahore'],
                    ['name' => 'NUAS Quetta Campus', 'code' => 'NUAS-QTA', 'city' => 'Quetta'],
                ],
            ],
        ];
    }

    /**
     * @return array{platform_admin: User, tenants: array<int, array{institution: Institution, campuses: array<int, Campus>}>}
     */
    public function seed(): array
    {
        $this->command?->info('UAT: seeding institutions, campuses and administrators');

        $platformAdmin = $this->platformAdmin();

        $tenants = [];
        foreach (static::fixtures() as $fixture) {
            $institution = Institution::firstOrCreate(
                ['code' => $fixture['code']],
                [
                    'name' => $fixture['name'],
                    'legal_name' => $fixture['name'].' (Registered)',
                    'email' => $fixture['email'],
                    'phone' => '+92-42-111-000-'.substr($fixture['code'], 0, 2),
                    'website' => $fixture['website'],
                    'address' => $fixture['address'],
                    'is_active' => true,
                    'plan' => $fixture['plan'],
                    'status' => 'active',
                    'max_campuses' => 10,
                ]
            );

            $campuses = [];
            foreach ($fixture['campuses'] as $campusFixture) {
                $campus = Campus::firstOrCreate(
                    ['institution_id' => $institution->id, 'code' => $campusFixture['code']],
                    $this->campusAttributes($fixture['type'], $campusFixture)
                );

                $this->campusAdmin($institution, $campus, $platformAdmin);

                $campuses[] = $campus;
            }

            $tenants[] = ['institution' => $institution, 'campuses' => $campuses];
        }

        return ['platform_admin' => $platformAdmin, 'tenants' => $tenants];
    }

    public function platformAdmin(): User
    {
        $user = User::firstOrCreate(
            ['email' => 'superadmin@'.self::EMAIL_DOMAIN],
            [
                'name' => 'UAT Platform Admin',
                'password' => self::passwordHash(),
                'email_verified_at' => now(),
                'job_title' => 'Platform Super User',
                'is_active' => true,
            ]
        );

        $user->syncRoles([RoleName::PlatformAdmin->value]);

        return $user;
    }

    public function campusAdmin(Institution $institution, Campus $campus, ?User $grantedBy = null): User
    {
        $slug = strtolower($campus->code);

        $user = User::firstOrCreate(
            ['email' => 'campusadmin.'.$slug.'@'.self::EMAIL_DOMAIN],
            [
                'name' => $campus->name.' Administrator',
                'password' => self::passwordHash(),
                'email_verified_at' => now(),
                'institution_id' => $institution->id,
                'campus_id' => $campus->id,
                'job_title' => 'Campus Administrator',
                'is_active' => true,
            ]
        );

        $user->syncRoles([RoleName::CampusAdmin->value]);

        ScopeAssignment::firstOrCreate(
            ['user_id' => $user->id, 'role' => RoleName::CampusAdmin->value],
            [
                'institution_id' => $institution->id,
                'campus_id' => $campus->id,
                'scope_type' => ScopeType::Campus,
                'scope_id' => $campus->id,
                'granted_by' => $grantedBy?->id,
                'is_active' => true,
            ]
        );

        return $user;
    }

    protected static function passwordHash(): string
    {
        /** @var string|null $hash */
        static $hash = null;

        return $hash ??= Hash::make(self::PASSWORD);
    }

    /**
     * @param  array{name: string, code: string, city: string}  $campusFixture
     * @return array<string, mixed>
     */
    protected function campusAttributes(string $type, array $campusFixture): array
    {
        $config = match ($type) {
            CampusType::College->value => [
                'academic_model' => 'college',
                'term_system' => 'semesters',
                'grading_system' => 'gpa',
                'credit_hours_enabled' => true,
            ],
            CampusType::University->value => [
                'academic_model' => 'university',
                'term_system' => 'semesters',
                'grading_system' => 'gpa',
                'credit_hours_enabled' => true,
            ],
            default => [
                'academic_model' => 'school',
                'term_system' => 'terms',
                'grading_system' => 'percentage',
                'credit_hours_enabled' => false,
            ],
        };

        $slug = strtolower($campusFixture['code']);

        return $config + [
            'name' => $campusFixture['name'],
            'code' => $campusFixture['code'],
            'type' => $type,
            'email' => $slug.'@educourt.test',
            'phone' => '+92-42-111-222-'.substr($campusFixture['code'], -2),
            'whatsapp' => '+92-300-'.sprintf('%07d', abs(crc32($slug)) % 9000000 + 1000000),
            'website' => 'https://'.$slug.'.educourt.test',
            'address' => $campusFixture['name'].', '.$campusFixture['city'],
            'is_active' => true,
        ];
    }
}
