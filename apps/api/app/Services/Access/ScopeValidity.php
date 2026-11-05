<?php

namespace App\Services\Access;

use App\Enums\RoleName;
use App\Models\ScopeAssignment;
use App\Models\User;

/**
 * Keeps the spatie role tables in step with the validity window stored on
 * scope assignments.
 *
 * Only roles that are actually governed by a scope assignment are touched.
 * Roles assigned directly (for example by seeders) are left alone.
 */
class ScopeValidity
{
    /**
     * Reconcile the user's managed roles with their current assignments.
     *
     * - Future-dated assignments are not granted yet.
     * - Expired assignments are switched off and their role revoked, unless
     *   another current assignment still backs the same role.
     *
     * Runs on every authenticated request; it only writes when the window
     * moved since the last reconciliation.
     *
     * @return array<int, string> Roles that were revoked.
     */
    public function reconcile(User $user): array
    {
        $assignments = ScopeAssignment::withoutGlobalScopes()
            ->where('user_id', $user->id)
            ->get();

        if ($assignments->isEmpty()) {
            return [];
        }

        $now = now();
        $changed = false;

        foreach ($assignments as $assignment) {
            if (! $assignment->is_active) {
                continue;
            }

            if ($assignment->ends_at !== null && $assignment->ends_at->lessThan($now)) {
                $assignment->forceFill(['is_active' => false])->save();
                $changed = true;
            }
        }

        $managed = $assignments
            ->map(fn (ScopeAssignment $assignment) => $this->roleValue($assignment))
            ->filter()
            ->unique();

        $current = $assignments
            ->filter(fn (ScopeAssignment $assignment) => $assignment->isCurrent())
            ->map(fn (ScopeAssignment $assignment) => $this->roleValue($assignment))
            ->filter()
            ->unique();

        $revoked = [];

        foreach ($managed as $role) {
            if ($current->contains($role)) {
                if (! $user->hasRole($role)) {
                    $user->assignRole($role);
                    $changed = true;
                }

                continue;
            }

            if ($user->hasRole($role)) {
                $user->removeRole($role);
                $revoked[] = $role;
                $changed = true;
            }
        }

        if ($changed) {
            activity('rbac')
                ->causedBy($user)
                ->withProperties(['revoked' => $revoked])
                ->log('Scope assignments reconciled with validity window');
        }

        return $revoked;
    }

    /**
     * Roles backed by at least one assignment that is current right now.
     *
     * @return array<int, string>
     */
    public function currentRoles(User $user): array
    {
        return ScopeAssignment::withoutGlobalScopes()
            ->current()
            ->where('user_id', $user->id)
            ->get()
            ->map(fn (ScopeAssignment $assignment) => $this->roleValue($assignment))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function roleValue(ScopeAssignment $assignment): ?string
    {
        $role = $assignment->role;

        return $role instanceof RoleName ? $role->value : (string) $role;
    }
}
