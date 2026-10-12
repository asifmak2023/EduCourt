<?php

namespace App\Support;

use App\Enums\RoleName;

class RoleCatalog
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public static function roles(): array
    {
        $restricted = RoleName::restrictedToProductOwner();
        $twoFactor = array_map(
            fn (RoleName $role) => $role->value,
            RoleName::twoFactorRequired()
        );

        return array_map(function (RoleName $role) use ($restricted, $twoFactor) {
            $permissions = self::permissionsFor($role->value);

            return [
                'value' => $role->value,
                'label' => $role->label(),
                'description' => $role->description(),
                'department' => $role->department(),
                'department_label' => $role->departmentLabel(),
                'grantable_by_campus_admin' => ! in_array($role->value, $restricted, true),
                'two_factor_required' => in_array($role->value, $twoFactor, true),
                'portal_only' => $role->isPortal(),
                'permissions' => $permissions,
                'modules' => self::groupByModule($permissions),
            ];
        }, RoleName::cases());
    }

    /**
     * @return array<string, array{label: string, actions: array<int, string>}>
     */
    public static function moduleMeta(): array
    {
        $modules = config('rbac.modules', []);
        $labels = self::moduleLabels();
        $result = [];

        foreach ($modules as $module => $actions) {
            $result[$module] = [
                'label' => $labels[$module] ?? str_replace('_', ' ', (string) $module),
                'actions' => array_values($actions),
            ];
        }

        return $result;
    }

    /**
     * @return array<int, string>
     */
    public static function permissionsFor(string $role): array
    {
        $modules = config('rbac.modules', []);
        $patterns = config("rbac.roles.{$role}", []);
        $baseline = config('rbac.baseline', []);

        return array_values(array_unique(array_merge(
            self::expand(is_array($patterns) ? $patterns : [], $modules),
            self::expand(is_array($baseline) ? $baseline : [], $modules),
        )));
    }

    /**
     * @param  array<int, string>  $permissions
     * @return array<string, array<int, string>>
     */
    public static function groupByModule(array $permissions): array
    {
        $grouped = [];

        foreach ($permissions as $permission) {
            [$module, $action] = array_pad(explode('.', $permission, 2), 2, null);

            if ($module && $action) {
                $grouped[$module][] = $action;
            }
        }

        return $grouped;
    }

    /**
     * @param  array<int, string>  $patterns
     * @param  array<string, array<int, string>>  $modules
     * @return array<int, string>
     */
    private static function expand(array $patterns, array $modules): array
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

    /**
     * @return array<string, string>
     */
    private static function moduleLabels(): array
    {
        return [
            'institution' => 'Institutions',
            'campus' => 'Campuses',
            'academic' => 'Academic structure',
            'curriculum' => 'Curriculum',
            'timetable' => 'Timetable',
            'user' => 'Users',
            'role' => 'Roles & access',
            'finance' => 'Finance',
            'fee' => 'Fees',
            'admission' => 'Admissions',
            'student' => 'Students',
            'attendance' => 'Attendance',
            'scholarship' => 'Scholarships',
            'concession' => 'Concessions',
            'fine' => 'Fines',
            'reminder' => 'Fee reminders',
            'conduct' => 'Conduct',
            'notification' => 'Notifications',
            'exam' => 'Exams',
            'credit' => 'Credits',
            'hr' => 'Human resources',
            'payroll' => 'Payroll',
            'inventory' => 'Inventory',
            'library' => 'Library',
            'lab' => 'Labs',
            'transport' => 'Transport',
            'hostel' => 'Hostel',
            'canteen' => 'Canteen',
            'sports' => 'Sports',
            'student_affairs' => 'Student affairs',
            'counselling' => 'Counselling',
            'complaint' => 'Complaints',
            'circular' => 'Circulars',
            'front_office' => 'Front office',
            'ptm' => 'Parent-teacher meetings',
            'report' => 'Reports',
            'it' => 'IT',
            'audit' => 'Audit',
            'setting' => 'Settings',
            'appearance' => 'Appearance',
            'subscription' => 'Subscriptions',
        ];
    }
}
