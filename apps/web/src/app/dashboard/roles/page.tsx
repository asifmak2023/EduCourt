"use client";

import { useEffect, useMemo, useState } from "react";
import { Table } from "@heroui/react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useList";
import { formatDate } from "@/lib/format";
import { useCampuses, usePermissionCatalog, useRoleOptions, useUsers } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Pagination } from "@/components/Pagination";
import { Button, Field, Select, TextInput } from "@/components/Form";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  SectionCard,
  Spinner,
  SuccessNotice,
} from "@/components/ui";
import { SCOPE_TYPE_OPTIONS } from "@/lib/rbacOptions";
import type { ScopeAssignment as BaseScopeAssignment, User } from "@/lib/types";

type ScopeAssignment = BaseScopeAssignment & {
  user?: User | null;
};

export default function RolesPage() {
  return (
    <PermissionGate permission="role.view">
      <RolesView />
    </PermissionGate>
  );
}

function RolesView() {
  const { can, canAny, user } = useAuth();
  const isCampusAdmin = user?.roles?.includes("campus_admin") ?? false;
  const isPlatformAdmin = user?.roles?.includes("platform_admin") ?? false;
  const isSuperUser = isPlatformAdmin;

  const { items: allRoles } = useRoleOptions();
  const permissionCatalog = usePermissionCatalog();
  const { items: users, loading: usersLoading } = useUsers(isCampusAdmin || isSuperUser);
  const { items: campuses } = useCampuses();

  const [version, setVersion] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>("all");
  const [showOnlyWithRoles, setShowOnlyWithRoles] = useState(false);
  const assignments = useList<ScopeAssignment>("/v1/scope-assignments", {
    _r: version,
    per_page: 200,
  });

  const bump = () => setVersion((current) => current + 1);

  // Filter roles based on who's viewing
  const grantableRoles = useMemo(() => {
    if (isSuperUser) return allRoles;
    // Campus admins can grant all except PlatformAdmin and CampusAdmin
    return allRoles.filter(
      (r) => r.value !== "platform_admin" && r.value !== "campus_admin"
    );
  }, [allRoles, isSuperUser]);

  const canEditRoles = can("role.edit") || can("role.create") || can("role.update") || canAny(AR_WRITE);

  // Build user -> assignments map
  const userAssignments = useMemo(() => {
    const map = new Map<number, ScopeAssignment[]>();
    assignments.items.forEach((a: ScopeAssignment) => {
      if (!map.has(a.user_id)) map.set(a.user_id, []);
      map.get(a.user_id)!.push(a);
    });
    return map;
  }, [assignments.items]);

  // Active assignments per user
  const getActiveRoles = (userId: number) => {
    return userAssignments.get(userId)?.filter((a: ScopeAssignment) => a.is_active) ?? [];
  };

  // Check if user already has a specific role
  const hasRole = (userId: number, roleValue: string) => {
    return getActiveRoles(userId).some((a: ScopeAssignment) => a.role === roleValue);
  };

  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    let result = users ?? [];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term)
      );
    }

    if (selectedRoleFilter !== "all") {
      result = result.filter((u) => hasRole(u.id, selectedRoleFilter));
    }

    if (showOnlyWithRoles) {
      result = result.filter((u) => getActiveRoles(u.id).length > 0);
    }

    return result;
  }, [users, searchTerm, selectedRoleFilter, showOnlyWithRoles, grantableRoles]);

  // Handle grant
  const grantRole = async (
    targetUserId: number,
    roleValue: string,
    campusId?: number
  ) => {
    try {
      await apiFetch("/v1/scope-assignments", {
        method: "POST",
        body: {
          user_id: targetUserId,
          role: roleValue,
          scope_type: "campus",
          campus_id: campusId ?? user?.campus_id,
        },
      });
      bump();
    } catch (err: unknown) {
      throw err instanceof ApiError ? err.message : "Unable to grant role";
    }
  };

  // Handle revoke
  const revokeRole = async (assignmentId: number) => {
    try {
      await apiFetch(`/v1/scope-assignments/${assignmentId}`, {
        method: "DELETE",
      });
      bump();
    } catch (err: unknown) {
      throw err instanceof ApiError ? err.message : "Unable to revoke role";
    }
  };

  // Bulk grant
  const bulkGrant = async (userIds: number[], roleValue: string) => {
    try {
      await Promise.all(
        userIds.map((uid) =>
          apiFetch("/v1/scope-assignments", {
            method: "POST",
            body: {
              user_id: uid,
              role: roleValue,
              scope_type: "campus",
              campus_id: user?.campus_id,
            },
          })
        )
      );
      bump();
    } catch (err: unknown) {
      throw err instanceof ApiError ? err.message : "Bulk grant failed";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Scopes"
        description={isCampusAdmin
          ? "Manage roles for your campus staff. Grant, revoke, and review access."
          : "Super User view — manage all role assignments across campuses."}
      />

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted">Total Users</p>
          <p className="text-2xl font-bold text-foreground">{users?.length ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Active Assignments</p>
          <p className="text-2xl font-bold text-foreground">
            {assignments.items.filter((a) => a.is_active).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Roles Available</p>
          <p className="text-2xl font-bold text-foreground">{grantableRoles.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted">Your Role</p>
          <Badge value={isSuperUser ? "platform_admin" : "campus_admin"} />
        </Card>
      </div>

      {/* User Role Matrix */}
      <SectionCard title="User Access Matrix" description="Click roles to grant/revoke">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4 p-4 bg-surface-secondary/50 rounded-lg">
          <div className="w-64">
            <TextInput
              type="search"
              placeholder="Search name or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-44">
            <Select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              {grantableRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyWithRoles}
              onChange={(e) => setShowOnlyWithRoles(e.target.checked)}
            />
            Only users with roles
          </label>
          <span className="text-sm text-muted ml-auto">
            {filteredUsers.length} of {users?.length ?? 0} users
          </span>
        </div>
        {usersLoading ? (
          <div className="py-8 text-center">
            <Spinner />
          </div>
        ) : users && users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-secondary text-left text-xs uppercase text-muted">
                  <th className="p-3 w-48">User</th>
                  <th className="p-3 w-32">Email</th>
                  {grantableRoles.map((role) => (
                    <th key={role.value} className="p-3 text-center">
                      <span className="truncate block max-w-[100px]">
                        {role.label}
                      </span>
                    </th>
                  ))}
                  <th className="p-3 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers
                  .filter((u) => !isSuperUser || u.id !== user?.id)
                  .map((targetUser) => {
                    const activeRoles = getActiveRoles(targetUser.id);
                    return (
                      <tr
                        key={targetUser.id}
                        className="border-b border-border-secondary/50 hover:bg-surface-secondary/50"
                      >
                        <td className="p-3 font-medium text-foreground">
                          {targetUser.name}
                        </td>
                        <td className="p-3 text-muted text-xs">{targetUser.email}</td>
                        {grantableRoles.map((role) => {
                          const hasThisRole = hasRole(targetUser.id, role.value);
                          const assignment = activeRoles.find(
                            (a) => a.role === role.value
                          );
                          return (
                            <td
                              key={role.value}
                              className="p-2 text-center"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  hasThisRole
                                    ? revokeRole(assignment!.id)
                                    : grantRole(targetUser.id, role.value)
                                }
                                disabled={!canEditRoles}
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                                  !canEditRoles
                                    ? "opacity-50 cursor-not-allowed"
                                    : hasThisRole
                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                    : "bg-surface-secondary text-muted hover:bg-accent/10 hover:text-accent"
                                }`}
                                title={!canEditRoles
                                  ? "No permission to edit roles"
                                  : hasThisRole
                                  ? `Revoke ${role.label}`
                                  : `Grant ${role.label}`}
                              >
                                {hasThisRole ? (
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    aria-hidden="true"
                                  >
                                    <path d="M20 6 9 17l-5-5" />
                                  </svg>
                                ) : (
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    aria-hidden="true"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 8v8M8 12h8" />
                                  </svg>
                                )}
                              </button>
                            </td>
                          );
                        })}
                        <td className="p-3">
                            {/* Role dropdown for quick assignment */}
                            <div className="relative">
                              <Select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    grantRole(targetUser.id, e.target.value);
                                  }
                                }}
                                className="w-full max-w-[160px]"
                              >
                                <option value="" disabled selected>
                                  + Assign Role
                                </option>
                                {grantableRoles
                                  .filter((role) => !hasRole(targetUser.id, role.value))
                                  .map((role) => (
                                    <option key={role.value} value={role.value}>
                                      {role.label}
                                    </option>
                                  ))}
                              </Select>
                            </div>
                            {activeRoles.length > 0 && (
                              <Button
                                variant="ghost"
                                className="mt-2 w-full max-w-[160px]"
                                onClick={() =>
                                  activeRoles.forEach((a) => revokeRole(a.id))
                                }
                              >
                                Revoke All
                              </Button>
                            )}
                          </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No users found." />
        )}
      </SectionCard>

      {/* Bulk Actions */}
      {can("role.edit") && (
        <SectionCard title="Bulk Grant Role">
          <BulkGrantForm
            roles={grantableRoles}
            users={users ?? []}
            onGranted={bulkGrant}
            onComplete={bump}
          />
        </SectionCard>
      )}

      {/* Detailed Scope Assignments */}
      {can("role.edit") && (
        <SectionCard title="Grant Custom Scope">
          <CustomScopeForm
            roles={grantableRoles}
            campuses={campuses}
            onCreated={bump}
          />
        </SectionCard>
      )}

      {/* Assignment History */}
      <Card>
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            All Scope Assignments
          </h2>
        </div>
        {assignments.loading ? (
          <div className="p-6">
            <Spinner />
          </div>
        ) : assignments.items.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No scope assignments yet." />
          </div>
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Scope assignments"
                className="min-w-[880px]"
              >
                <Table.Header>
                  <Table.Column isRowHeader>User</Table.Column>
                  <Table.Column>Role</Table.Column>
                  <Table.Column>Scope</Table.Column>
                  <Table.Column>Campus</Table.Column>
                  <Table.Column>Valid from</Table.Column>
                  <Table.Column>Valid to</Table.Column>
                  <Table.Column>Status</Table.Column>
                  <Table.Column>{""}</Table.Column>
                </Table.Header>
                <Table.Body>
                  {assignments.items.map((assignment) => (
                    <Table.Row key={assignment.id} id={assignment.id}>
                      <Table.Cell className="text-foreground">
                        {assignment.user?.name ?? `User #${assignment.user_id}`}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={assignment.role_label ?? assignment.role ?? "-"} />
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {assignment.scope_type ?? "-"}
                        {assignment.scope_id ? ` #${assignment.scope_id}` : ""}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {assignment.campus?.name ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {formatDate(assignment.starts_at)}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {formatDate(assignment.ends_at) ?? "—"}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge
                          value={assignment.is_active ? "active" : "inactive"}
                        />
                      </Table.Cell>
                      <Table.Cell className="text-right">
                        {assignment.is_active ? (
                          <Button
                            variant="danger"
                            onClick={() => revokeRole(assignment.id)}
                          >
                            Revoke
                          </Button>
                        ) : (
                          <span className="text-xs text-muted">Revoked</span>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}

        {assignments.meta ? (
          <Pagination
            page={assignments.page}
            lastPage={assignments.meta.last_page}
            total={assignments.meta.total}
            onPage={assignments.setPage}
          />
        ) : null}
      </Card>
    </div>
  );
}

function BulkGrantForm({
  roles,
  users,
  onGranted,
  onComplete,
}: {
  roles: { value: string; label: string }[];
  users: User[];
  onGranted: (userIds: number[], roleValue: string) => Promise<void>;
  onComplete: () => void;
}) {
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedRole || selectedUserIds.length === 0) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await onGranted(selectedUserIds.map(Number), selectedRole);
      setSuccess(`Granted to ${selectedUserIds.length} user(s)`);
      setSelectedUserIds([]);
      onComplete();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Role to grant" htmlFor="bulk_role" required>
          <Select
            id="bulk_role"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="">Select role</option>
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Users" htmlFor="bulk_users" required>
          <Select
            id="bulk_users"
            multiple
            value={selectedUserIds}
            onChange={(e) => {
              const options = Array.from(e.target.selectedOptions);
              setSelectedUserIds(options.map((o) => o.value));
            }}
            className="min-h-[100px]"
          >
            {users.map((u) => (
              <option key={u.id} value={String(u.id)}>
                {u.name} ({u.email})
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end">
          <Button onClick={handleSubmit} loading={busy} disabled={!selectedRole || selectedUserIds.length === 0}>
            Grant to {selectedUserIds.length} user(s)
          </Button>
        </div>
      </div>
      {error && <ErrorNotice message={error} />}
      {success && <SuccessNotice message={success} />}
    </Card>
  );
}

function CustomScopeForm({
  roles,
  campuses,
  onCreated,
}: {
  roles: { value: string; label: string }[];
  campuses: { id: number; name: string }[];
  onCreated: () => void;
}) {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [campusId, setCampusId] = useState("");
  const [scopeType, setScopeType] = useState("campus");
  const [scopeId, setScopeId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { items: users } = useUsers();

  const submit = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch("/v1/scope-assignments", {
        method: "POST",
        body: {
          user_id: Number(userId),
          role,
          scope_type: scopeType,
          ...(campusId ? { campus_id: Number(campusId) } : {}),
          ...(scopeId ? { scope_id: Number(scopeId) } : {}),
          ...(startsAt ? { starts_at: startsAt } : {}),
          ...(endsAt ? { ends_at: endsAt } : {}),
        },
      });
      setUserId("");
      setRole("");
      setCampusId("");
      setScopeId("");
      setStartsAt("");
      setEndsAt("");
      setSuccess("Scope granted successfully");
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Unable to grant scope");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-foreground">Advanced scope assignment</h2>
      <p className="mt-0.5 text-xs text-muted">
        For custom scopes (institution, section, class, etc.) or specific date ranges.
      </p>
      {error && <ErrorNotice message={error} />}
      {success && <SuccessNotice message={success} />}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="User" htmlFor="scope_user" required>
          <Select
            id="scope_user"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="">Select user</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Role" htmlFor="scope_role" required>
          <Select
            id="scope_role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">Select role</option>
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Campus" htmlFor="scope_campus">
          <Select
            id="scope_campus"
            value={campusId}
            onChange={(e) => setCampusId(e.target.value)}
          >
            <option value="">Current campus</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Scope type" htmlFor="scope_type" required>
          <Select
            id="scope_type"
            value={scopeType}
            onChange={(e) => setScopeType(e.target.value)}
          >
            {SCOPE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Scope ID" htmlFor="scope_id" hint="Optional">
          <TextInput
            id="scope_id"
            type="number"
            value={scopeId}
            onChange={(e) => setScopeId(e.target.value)}
          />
        </Field>
        <Field label="Starts at" htmlFor="scope_starts">
          <TextInput
            id="scope_starts"
            type="date"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </Field>
        <Field label="Ends at" htmlFor="scope_ends">
          <TextInput
            id="scope_ends"
            type="date"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </Field>
      </div>
      <div className="mt-4">
        <Button onClick={submit} loading={busy} disabled={!userId || !role}>
          Grant Scope
        </Button>
      </div>
    </Card>
  );
}