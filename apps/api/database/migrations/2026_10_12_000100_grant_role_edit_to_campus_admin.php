<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permission = Permission::findOrCreate('role.edit', 'web');
        $role = Role::query()
            ->where('name', 'campus_admin')
            ->where('guard_name', 'web')
            ->first();

        if ($role !== null) {
            $role->givePermissionTo($permission);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $role = Role::query()
            ->where('name', 'campus_admin')
            ->where('guard_name', 'web')
            ->first();

        if ($role !== null) {
            $role->revokePermissionTo('role.edit');
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
