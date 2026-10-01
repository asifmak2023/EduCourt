<?php

namespace Database\Seeders\Uat;

use App\Enums\ScopeType;
use App\Models\Campus;
use App\Models\ScopeAssignment;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Shared helpers for the UAT seeders: deterministic pseudo-random selection,
 * logical Pakistani fixture name pools, and tenant-scoped firstOrCreate.
 */
abstract class UatSeederBase extends Seeder
{
    /** @var array<int, string> */
    protected const FIRST_NAMES_MALE = [
        'Muhammad', 'Ahmed', 'Ali', 'Hassan', 'Hussain', 'Usman', 'Bilal', 'Hamza', 'Umar', 'Abdullah',
        'Zain', 'Faizan', 'Danish', 'Talha', 'Shahzaib', 'Adeel', 'Waqas', 'Fahad', 'Saad', 'Kashif',
        'Imran', 'Kamran', 'Naveed', 'Arslan', 'Junaid', 'Rizwan', 'Salman', 'Tariq', 'Yasir', 'Zubair',
        'Farhan', 'Rehan', 'Owais', 'Sufyan', 'Haris', 'Noman', 'Moiz', 'Anas', 'Huzaifa', 'Bilawal',
    ];

    /** @var array<int, string> */
    protected const FIRST_NAMES_FEMALE = [
        'Fatima', 'Ayesha', 'Zainab', 'Maryam', 'Hafsa', 'Sana', 'Hira', 'Areeba', 'Iqra', 'Noor',
        'Amna', 'Laiba', 'Eman', 'Rida', 'Mahnoor', 'Khadija', 'Sadia', 'Saba', 'Nimra', 'Uzma',
        'Rabia', 'Anum', 'Sundus', 'Warda', 'Mehwish', 'Beenish', 'Farah', 'Gulzar', 'Nazia', 'Shazia',
        'Asma', 'Rukhsana', 'Sidra', 'Aiman', 'Javeria', 'Zoya', 'Alina', 'Mishal', 'Komal', 'Sumaira',
    ];

    /** @var array<int, string> */
    protected const LAST_NAMES = [
        'Khan', 'Ahmed', 'Malik', 'Butt', 'Chaudhry', 'Sheikh', 'Qureshi', 'Awan', 'Raza', 'Hussain',
        'Iqbal', 'Farooq', 'Siddiqui', 'Abbasi', 'Mughal', 'Gill', 'Gondal', 'Niazi', 'Afridi', 'Ansari',
        'Baig', 'Dar', 'Hashmi', 'Javed', 'Kazmi', 'Lodhi', 'Mirza', 'Nawaz', 'Pasha', 'Rana',
        'Saeed', 'Tarar', 'Yousaf', 'Zafar', 'Bhatti', 'Janjua', 'Kharal', 'Sial', 'Warsi', 'Zaman',
    ];

    /** @var array<int, string> */
    protected const CITIES = [
        'Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta',
        'Gujranwala', 'Hyderabad', 'Sialkot', 'Bahawalpur', 'Sargodha', 'Sukkur', 'Abbottabad',
    ];

    /** @var array<int, string> */
    protected const STREETS = [
        'Main Boulevard', 'Jinnah Road', 'Mall Road', 'Canal Road', 'University Road', 'Ferozepur Road',
        'GT Road', 'Airport Road', 'Model Town Link Road', 'Garden Avenue', 'Gulberg Main Road', 'Sadar Bazaar',
    ];

    /**
     * Attach the console command so seeders invoked directly (not via
     * $this->call) can still write progress output.
     */
    public function withCommand($command): static
    {
        $this->command = $command;

        return $this;
    }

    /**
     * @return array{institution_id: int, campus_id: int}
     */
    protected function tenant(Campus $campus): array
    {
        return [
            'institution_id' => (int) $campus->institution_id,
            'campus_id' => (int) $campus->id,
        ];
    }

    /**
     * Tenant-scoped firstOrCreate helper.
     *
     * @param  class-string<\Illuminate\Database\Eloquent\Model>  $model
     * @param  array<string, mixed>  $keys
     * @param  array<string, mixed>  $values
     */
    protected function first(string $model, array $keys, array $values = [])
    {
        return $model::firstOrCreate($keys, $values);
    }

    protected function randInt(int $min, int $max): int
    {
        return mt_rand($min, $max);
    }

    protected function pick(array $list)
    {
        return $list[mt_rand(0, count($list) - 1)];
    }

    protected function chance(int $percent): bool
    {
        return mt_rand(1, 100) <= $percent;
    }

    /**
     * Deterministic person name from the shared pools.
     *
     * @return array{first_name: string, last_name: string}
     */
    protected function person(int $index, ?string $gender = null): array
    {
        $gender ??= $index % 2 === 0 ? 'male' : 'female';

        $first = $gender === 'female'
            ? static::FIRST_NAMES_FEMALE[$index % count(static::FIRST_NAMES_FEMALE)]
            : static::FIRST_NAMES_MALE[$index % count(static::FIRST_NAMES_MALE)];

        $last = static::LAST_NAMES[($index * 7) % count(static::LAST_NAMES)];

        return ['first_name' => $first, 'last_name' => $last];
    }

    protected function city(int $index): string
    {
        return static::CITIES[$index % count(static::CITIES)];
    }

    protected function street(int $index): string
    {
        return static::STREETS[$index % count(static::STREETS)];
    }

    protected function phone(Campus $campus, int $index): string
    {
        return sprintf('+92-3%02d-%07d', ($campus->id % 90) + 10, ($index % 9000000) + 1000000);
    }

    protected function cnic(int $index): string
    {
        return sprintf('35202-%07d-%d', ($index % 9000000) + 1000000, $index % 10);
    }

    protected function decimal(float $value, int $precision = 2): float
    {
        return round($value, $precision);
    }

    /**
     * The shared UAT password hash, computed once per process.
     */
    protected static function pw(): string
    {
        /** @var string|null $hash */
        static $hash = null;

        return $hash ??= Hash::make(UatFoundationSeeder::PASSWORD);
    }

    /**
     * Attach the Spatie role and the app-level campus scope for a user.
     */
    protected function assignRole(UatCampusContext $ctx, User $user, string $role, ?User $grantedBy = null): void
    {
        $user->syncRoles([$role]);

        ScopeAssignment::firstOrCreate(
            ['user_id' => $user->id, 'role' => $role],
            [
                'institution_id' => $ctx->institution->id,
                'campus_id' => $ctx->campus->id,
                'scope_type' => ScopeType::Campus,
                'scope_id' => $ctx->campus->id,
                'granted_by' => $grantedBy?->id ?? $ctx->platformAdmin?->id,
                'is_active' => true,
            ]
        );
    }

    /**
     * Deterministic date string offset from a base date.
     */
    protected function day(string $base, int $offset): string
    {
        return \Illuminate\Support\Carbon::parse($base)->addDays($offset)->toDateString();
    }
}
