<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Portal accounts (student / parent-guardian) must not hold staff-module
 * permissions: those permissions gate the campus-wide staff endpoints, which
 * do not narrow rows to the caller. Family data is served exclusively by the
 * permission-free /v1/me/* endpoints.
 *
 * The canonical source is config/rbac.php (now empty for both roles). This
 * migration revokes the previously-granted permissions from existing role
 * rows, because the production deploy never runs seeders.
 */
return new class extends Migration
{
    /**
     * @var array<string, array<int, string>>
     */
    private const STAFF_PERMISSIONS = [
        'student' => [
            'attendance.view', 'exam.view', 'academic.view',
            'timetable.view', 'credit.view', 'circular.view', 'complaint.create',
        ],
        'parent_guardian' => [
            'student.view', 'attendance.view', 'exam.view', 'fee.view',
            'academic.view', 'timetable.view', 'credit.view', 'circular.view',
            'complaint.view', 'complaint.create',
        ],
    ];

    public function up(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (self::STAFF_PERMISSIONS as $roleName => $permissions) {
            $role = Role::query()
                ->where('name', $roleName)
                ->where('guard_name', 'web')
                ->first();

            if ($role === null) {
                continue;
            }

            $existing = Permission::query()
                ->where('guard_name', 'web')
                ->whereIn('name', $permissions)
                ->get();

            if ($existing->isNotEmpty()) {
                $role->revokePermissionTo($existing);
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Intentionally irreversible: restoring staff-module permissions to
        // portal roles would reintroduce the cross-scope data leak this
        // migration closes.
    }
};
