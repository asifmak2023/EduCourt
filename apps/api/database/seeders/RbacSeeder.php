<?php

namespace Database\Seeders;

use App\Enums\RoleName;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RbacSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $modules = config('rbac.modules');

        foreach ($modules as $module => $actions) {
            foreach ($actions as $action) {
                Permission::findOrCreate("{$module}.{$action}", 'web');
            }
        }

        $roleDefinitions = config('rbac.roles');
        $baseline = $this->expand(config('rbac.baseline', []), $modules);

        foreach ($roleDefinitions as $roleName => $patterns) {
            $role = Role::findOrCreate($roleName, 'web');
            $permissions = array_values(array_unique(array_merge(
                $this->expand($patterns, $modules),
                $baseline
            )));

            $role->syncPermissions($permissions);
        }

        // Ensure every declared role exists even if it has no explicit patterns yet.
        // Roles without an explicit definition still receive the baseline permissions.
        foreach (RoleName::cases() as $roleEnum) {
            $role = Role::findOrCreate($roleEnum->value, 'web');

            if ($baseline !== [] && ! array_key_exists($roleEnum->value, $roleDefinitions)) {
                $role->syncPermissions($baseline);
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Expand wildcard permission patterns into concrete permission names.
     *
     * @param  array<int, string>  $patterns
     * @param  array<string, array<int, string>>  $modules
     * @return array<int, string>
     */
    private function expand(array $patterns, array $modules): array
    {
        $result = [];

        foreach ($patterns as $pattern) {
            if ($pattern === '*') {
                foreach ($modules as $module => $actions) {
                    foreach ($actions as $action) {
                        $result[] = "{$module}.{$action}";
                    }
                }

                continue;
            }

            if (str_ends_with($pattern, '.*')) {
                $module = substr($pattern, 0, -2);

                foreach ($modules[$module] ?? [] as $action) {
                    $result[] = "{$module}.{$action}";
                }

                continue;
            }

            $result[] = $pattern;
        }

        return array_values(array_unique($result));
    }
}
