"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Table } from "@heroui/react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useList";
import { formatDate } from "@/lib/format";
import { useCampuses, useRoleCatalog } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Pagination } from "@/components/Pagination";
import { Avatar } from "@/components/Avatar";
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
import {
  combinedModules,
  formatAction,
  formatModule,
  RESTRICTED_ROLES,
} from "@/lib/roles";
import type {
  RoleModuleMeta,
  RoleOption,
  ScopeAssignment as BaseScopeAssignment,
  User,
} from "@/lib/types";

type ScopeAssignment = BaseScopeAssignment & {
  user?: User | null;
};

type TabKey = "people" | "catalogue" | "history";

export default function RolesPage() {
  return (
    <PermissionGate permission="role.view">
      <RolesView />
    </PermissionGate>
  );
}

function RolesView() {
  const { can, user } = useAuth();
  const isCampusAdmin = user?.roles?.includes("campus_admin") ?? false;
  const isPlatformAdmin = user?.roles?.includes("platform_admin") ?? false;
  const isSuperUser = isPlatformAdmin;
  const canEditRoles = can("role.edit");

  const catalog = useRoleCatalog();
  const { items: campuses } = useCampuses();

  const [tab, setTab] = useState<TabKey>("people");
  const [version, setVersion] = useState(0);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("staff");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null
  );

  const people = useList<User>("/v1/users", {
    _r: version,
    per_page: 50,
    ...(selectedRoleFilter !== "all" ? { role: selectedRoleFilter } : {}),
  });
  const assignments = useList<ScopeAssignment>("/v1/scope-assignments", {
    _r: version,
    per_page: 50,
  });
  const users = people.items;
  const usersLoading = people.loading;
  const usersError = people.error;

  const bump = () => setVersion((current) => current + 1);

  useEffect(() => {
    if (!selectedUser) {
      return;
    }
    const fresh = users.find((entry) => entry.id === selectedUser.id);
    if (fresh && fresh !== selectedUser) {
      setSelectedUser(fresh);
    }
  }, [users, selectedUser]);

  const grantableRoles = useMemo(() => {
    if (isSuperUser) return catalog.items;
    return catalog.items.filter((role) => role.grantable_by_campus_admin !== false);
  }, [catalog.items, isSuperUser]);

  const roleByValue = useMemo(() => {
    const map = new Map<string, RoleOption>();
    catalog.items.forEach((role) => map.set(role.value, role));
    return map;
  }, [catalog.items]);

  const assignmentsFor = (target: User): ScopeAssignment[] => {
    if (target.scope_assignments && target.scope_assignments.length > 0) {
      return target.scope_assignments;
    }
    return assignments.items.filter((item) => item.user_id === target.id);
  };

  const getActiveRoles = (target: User) => {
    const fromUser = (target.roles ?? []).filter(Boolean);
    const fromAssignments = assignmentsFor(target)
      .filter((assignment) => assignment.is_active)
      .map((assignment) => assignment.role)
      .filter((role): role is string => Boolean(role));
    return Array.from(new Set([...fromUser, ...fromAssignments]));
  };

  const filteredUsers = useMemo(() => {
    let result = users ?? [];

    if (accountFilter === "staff") {
      result = result.filter((entry) => {
        const roles = getActiveRoles(entry);
        return roles.length === 0 || roles.some((role) => !roleByValue.get(role)?.portal_only);
      });
    } else if (accountFilter === "portal") {
      result = result.filter((entry) => {
        const roles = getActiveRoles(entry);
        return roles.length > 0 && roles.every((role) => roleByValue.get(role)?.portal_only);
      });
    } else if (accountFilter === "unassigned") {
      result = result.filter((entry) => getActiveRoles(entry).length === 0);
    }

    return result;
  }, [
    users,
    accountFilter,
    roleByValue,
    assignments.items,
  ]);

  const staffCount = (users ?? []).filter((entry) => {
    const roles = getActiveRoles(entry);
    return roles.length === 0 || roles.some((role) => !roleByValue.get(role)?.portal_only);
  }).length;

  const flash = (kind: "ok" | "err", text: string) => {
    setNotice({ kind, text });
  };

  const grantRole = async (
    targetUser: User,
    roleValue: string,
    extras?: {
      campusId?: number;
      scopeType?: string;
      scopeId?: number;
      startsAt?: string;
      endsAt?: string;
    }
  ) => {
    try {
      await apiFetch("/v1/scope-assignments", {
        method: "POST",
        body: {
          user_id: targetUser.id,
          role: roleValue,
          scope_type: extras?.scopeType ?? "campus",
          campus_id: extras?.campusId ?? targetUser.campus_id ?? user?.campus_id,
          ...(extras?.scopeId ? { scope_id: extras.scopeId } : {}),
          ...(extras?.startsAt ? { starts_at: extras.startsAt } : {}),
          ...(extras?.endsAt ? { ends_at: extras.endsAt } : {}),
        },
      });
      bump();
      flash("ok", `${roleByValue.get(roleValue)?.label ?? roleValue} granted to ${targetUser.name}.`);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Unable to grant role.";
      flash("err", message);
      throw err;
    }
  };

  const revokeAssignment = async (assignment: ScopeAssignment) => {
    try {
      await apiFetch(`/v1/scope-assignments/${assignment.id}`, {
        method: "DELETE",
      });
      bump();
      flash(
        "ok",
        `${assignment.role_label ?? assignment.role ?? "Role"} revoked.`
      );
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Unable to revoke role.";
      flash("err", message);
      throw err;
    }
  };

  const revokeRoleForUser = async (targetUser: User, roleValue: string) => {
    const matches = assignmentsFor(targetUser).filter(
      (assignment) => assignment.is_active && assignment.role === roleValue
    );

    if (matches.length > 0) {
      for (const assignment of matches) {
        await revokeAssignment(assignment);
      }
      return;
    }

    const remaining = (targetUser.roles ?? []).filter((role) => role !== roleValue);
    if (remaining.length === 0) {
      flash("err", "Keep at least one role, or assign a replacement first.");
      return;
    }

    try {
      await apiFetch(`/v1/users/${targetUser.id}`, {
        method: "PUT",
        body: { roles: remaining },
      });
      bump();
      flash("ok", `${roleByValue.get(roleValue)?.label ?? roleValue} revoked.`);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : "Unable to revoke role.";
      flash("err", message);
      throw err;
    }
  };

  const canManageUser = (target: User) => {
    if (!canEditRoles) return false;
    if (target.id === user?.id) return false;
    const roles = getActiveRoles(target);
    if (!isSuperUser && roles.some((role) => RESTRICTED_ROLES.has(role))) {
      return false;
    }
    return true;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & access"
        description={
          isCampusAdmin
            ? "See who can do what on this campus. Grant or revoke staff roles in one place."
            : "See who can do what across campuses. Grant or revoke roles and review default access."
        }
      />

      {notice ? (
        notice.kind === "ok" ? (
          <SuccessNotice message={notice.text} />
        ) : (
          <ErrorNotice message={notice.text} />
        )
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="People" value={users?.length ?? 0} hint="On this campus" />
        <Stat label="Staff accounts" value={staffCount} hint="Excludes portal-only" />
        <Stat
          label="Active assignments"
          value={assignments.items.filter((assignment) => assignment.is_active).length}
          hint="Current grants"
        />
        <Stat
          label="Default roles"
          value={catalog.items.length}
          hint="Built-in access templates"
        />
      </div>

      <nav className="flex flex-wrap gap-2">
        <TabButton active={tab === "people"} onClick={() => setTab("people")}>
          People
        </TabButton>
        <TabButton active={tab === "catalogue"} onClick={() => setTab("catalogue")}>
          Default roles
        </TabButton>
        <TabButton active={tab === "history"} onClick={() => setTab("history")}>
          Assignment history
        </TabButton>
      </nav>

      {tab === "people" ? (
        <PeoplePanel
          users={filteredUsers}
          allCount={people.meta?.total ?? users?.length ?? 0}
          loading={usersLoading}
          error={usersError}
          pagination={people.meta}
          page={people.page}
          onPage={people.setPage}
          searchTerm={people.search}
          onSearch={(value) => {
            people.setPage(1);
            people.setSearch(value);
          }}
          selectedRoleFilter={selectedRoleFilter}
          onRoleFilter={(value) => {
            people.setPage(1);
            setSelectedRoleFilter(value);
          }}
          accountFilter={accountFilter}
          onAccountFilter={setAccountFilter}
          roles={catalog.items}
          modules={catalog.modules}
          getActiveRoles={getActiveRoles}
          canManageUser={canManageUser}
          canEditRoles={canEditRoles}
          onManage={setSelectedUser}
        />
      ) : null}

      {tab === "catalogue" ? (
        <CataloguePanel
          roles={catalog.items}
          modules={catalog.modules}
          loading={catalog.loading}
          error={catalog.error}
        />
      ) : null}

      {tab === "history" ? (
        <HistoryPanel
          assignments={assignments}
          canEditRoles={canEditRoles}
          onRevoke={revokeAssignment}
        />
      ) : null}

      {selectedUser ? (
        <ManageAccessDrawer
          target={selectedUser}
          roles={getActiveRoles(selectedUser)}
          assignments={assignmentsFor(selectedUser).filter((item) => item.is_active)}
          catalog={catalog.items}
          modules={catalog.modules}
          grantableRoles={grantableRoles}
          campuses={campuses}
          canEdit={canManageUser(selectedUser)}
          onClose={() => setSelectedUser(null)}
          onGrant={grantRole}
          onRevokeRole={(roleValue) => revokeRoleForUser(selectedUser, roleValue)}
        />
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </Card>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-accent text-accent-foreground"
          : "bg-surface-secondary text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function PeoplePanel({
  users,
  allCount,
  loading,
  error,
  pagination,
  page,
  onPage,
  searchTerm,
  onSearch,
  selectedRoleFilter,
  onRoleFilter,
  accountFilter,
  onAccountFilter,
  roles,
  modules,
  getActiveRoles,
  canManageUser,
  canEditRoles,
  onManage,
}: {
  users: User[];
  allCount: number;
  loading: boolean;
  error: string | null;
  pagination: { last_page: number; total: number } | null;
  page: number;
  onPage: (page: number) => void;
  searchTerm: string;
  onSearch: (value: string) => void;
  selectedRoleFilter: string;
  onRoleFilter: (value: string) => void;
  accountFilter: string;
  onAccountFilter: (value: string) => void;
  roles: RoleOption[];
  modules: Record<string, RoleModuleMeta>;
  getActiveRoles: (user: User) => string[];
  canManageUser: (user: User) => boolean;
  canEditRoles: boolean;
  onManage: (user: User) => void;
}) {
  return (
    <SectionCard
      title="People & access"
      description="Each person, the roles they hold, and the modules those roles unlock."
    >
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <TextInput
            type="search"
            placeholder="Search name, email or job title"
            value={searchTerm}
            onChange={(event) => onSearch(event.target.value)}
          />
        </div>
        <div className="w-48">
          <Select
            value={accountFilter}
            onChange={(event) => onAccountFilter(event.target.value)}
            aria-label="Account type"
          >
            <option value="staff">Staff accounts</option>
            <option value="portal">Portal only</option>
            <option value="unassigned">No role yet</option>
            <option value="all">All accounts</option>
          </Select>
        </div>
        <div className="w-48">
          <Select
            value={selectedRoleFilter}
            onChange={(event) => onRoleFilter(event.target.value)}
            aria-label="Filter by role"
          >
            <option value="all">All roles</option>
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </Select>
        </div>
        <p className="ms-auto text-sm text-muted">
          {users.length} of {allCount}
        </p>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      {loading ? (
        <Spinner />
      ) : users.length === 0 ? (
        <EmptyState message="No people match these filters." />
      ) : (
        <ul className="divide-y divide-border-secondary">
          {users.map((entry) => {
            const activeRoles = getActiveRoles(entry);
            const access = combinedModules(activeRoles, roles);
            const moduleNames = Object.keys(access);
            return (
              <li key={entry.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Avatar name={entry.name} photoUrl={entry.photo_url} size="sm" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{entry.name}</p>
                      {entry.is_active === false ? <Badge value="inactive" /> : null}
                    </div>
                    <p className="truncate text-xs text-muted">{entry.email}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {[entry.job_title, entry.campus?.name].filter(Boolean).join(" · ") ||
                        "No job title"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {activeRoles.length > 0 ? (
                        activeRoles.map((role) => (
                          <span
                            key={role}
                            className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-soft-foreground"
                          >
                            {roles.find((item) => item.value === role)?.label ??
                              role.replace(/_/g, " ")}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted">No role assigned</span>
                      )}
                    </div>
                    {moduleNames.length > 0 ? (
                      <p className="mt-2 text-xs text-muted">
                        Access to {moduleNames.length} module
                        {moduleNames.length === 1 ? "" : "s"}:{" "}
                        {moduleNames
                          .slice(0, 6)
                          .map((module) => formatModule(module, modules[module]?.label))
                          .join(", ")}
                        {moduleNames.length > 6
                          ? ` +${moduleNames.length - 6} more`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="shrink-0 sm:pt-1">
                  <Button
                    variant={canManageUser(entry) ? "secondary" : "ghost"}
                    onClick={() => onManage(entry)}
                  >
                    {canEditRoles && canManageUser(entry) ? "Manage access" : "View access"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {pagination && pagination.last_page > 1 ? (
        <Pagination
          page={page}
          lastPage={pagination.last_page}
          total={pagination.total}
          onPage={onPage}
        />
      ) : null}
    </SectionCard>
  );
}

function CataloguePanel({
  roles,
  modules,
  loading,
  error,
}: {
  roles: RoleOption[];
  modules: Record<string, RoleModuleMeta>;
  loading: boolean;
  error: string | null;
}) {
  const [openRole, setOpenRole] = useState<string | null>(null);
  const grouped = useMemo(() => {
    const map = new Map<string, RoleOption[]>();
    roles.forEach((role) => {
      const key = role.department_label ?? "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(role);
    });
    return Array.from(map.entries());
  }, [roles]);

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        These are the built-in roles. Each role comes with a default set of module
        permissions. Campus admins can grant any role except Campus Admin and Super User.
      </p>
      {grouped.map(([department, items]) => (
        <SectionCard key={department} title={department}>
          <div className="grid gap-3 lg:grid-cols-2">
            {items.map((role) => {
              const open = openRole === role.value;
              const moduleEntries = Object.entries(role.modules ?? {});
              return (
                <div
                  key={role.value}
                  className="rounded-xl border border-border-secondary p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{role.label}</p>
                      <p className="mt-1 text-xs text-muted">{role.description}</p>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-medium text-accent"
                      onClick={() => setOpenRole(open ? null : role.value)}
                    >
                      {open ? "Hide" : "Permissions"}
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {role.grantable_by_campus_admin === false ? (
                      <Badge value="super user only" />
                    ) : (
                      <Badge value="campus admin can grant" />
                    )}
                    {role.two_factor_required ? <Badge value="2FA required" /> : null}
                    {role.portal_only ? <Badge value="portal only" /> : null}
                    <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-muted">
                      {role.permissions?.length ?? 0} permissions
                    </span>
                  </div>
                  {open ? (
                    <div className="mt-4 space-y-3">
                      {moduleEntries.length === 0 ? (
                        <p className="text-xs text-muted">
                          No staff-module permissions. Portal data is served separately.
                        </p>
                      ) : (
                        moduleEntries.map(([module, actions]) => (
                          <div key={module}>
                            <p className="text-xs font-medium text-foreground">
                              {formatModule(module, modules[module]?.label)}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {actions.map((action) => (
                                <span
                                  key={action}
                                  className="rounded-md bg-surface-secondary px-1.5 py-0.5 text-[11px] capitalize text-muted"
                                >
                                  {formatAction(action)}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </SectionCard>
      ))}
    </div>
  );
}

function HistoryPanel({
  assignments,
  canEditRoles,
  onRevoke,
}: {
  assignments: {
    items: ScopeAssignment[];
    loading: boolean;
    meta: { last_page: number; total: number } | null;
    page: number;
    setPage: (page: number) => void;
  };
  canEditRoles: boolean;
  onRevoke: (assignment: ScopeAssignment) => Promise<void>;
}) {
  return (
    <Card>
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">Assignment history</h2>
        <p className="mt-0.5 text-xs text-muted">
          Every grant on this campus, including date range and who it applies to.
        </p>
      </div>
      {assignments.loading ? (
        <Spinner />
      ) : assignments.items.length === 0 ? (
        <EmptyState message="No scope assignments yet." />
      ) : (
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content aria-label="Scope assignments" className="min-w-[880px]">
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
                      {formatDate(assignment.ends_at) === "-"
                        ? "Ongoing"
                        : formatDate(assignment.ends_at)}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge value={assignment.is_active ? "active" : "inactive"} />
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      {assignment.is_active && canEditRoles ? (
                        <Button
                          variant="danger"
                          onClick={() => void onRevoke(assignment)}
                        >
                          Revoke
                        </Button>
                      ) : (
                        <span className="text-xs text-muted">
                          {assignment.is_active ? "" : "Revoked"}
                        </span>
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
  );
}

function ManageAccessDrawer({
  target,
  roles,
  assignments,
  catalog,
  modules,
  grantableRoles,
  campuses,
  canEdit,
  onClose,
  onGrant,
  onRevokeRole,
}: {
  target: User;
  roles: string[];
  assignments: ScopeAssignment[];
  catalog: RoleOption[];
  modules: Record<string, RoleModuleMeta>;
  grantableRoles: RoleOption[];
  campuses: { id: number; name: string }[];
  canEdit: boolean;
  onClose: () => void;
  onGrant: (
    target: User,
    roleValue: string,
    extras?: {
      campusId?: number;
      scopeType?: string;
      scopeId?: number;
      startsAt?: string;
      endsAt?: string;
    }
  ) => Promise<void>;
  onRevokeRole: (roleValue: string) => Promise<void>;
}) {
  const [roleToGrant, setRoleToGrant] = useState("");
  const [campusId, setCampusId] = useState(
    target.campus_id ? String(target.campus_id) : ""
  );
  const [scopeType, setScopeType] = useState("campus");
  const [scopeId, setScopeId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const available = grantableRoles.filter((role) => !roles.includes(role.value));
  const access = combinedModules(roles, catalog);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const submitGrant = async () => {
    if (!roleToGrant) return;
    setBusy(true);
    try {
      await onGrant(target, roleToGrant, {
        campusId: campusId ? Number(campusId) : undefined,
        scopeType,
        scopeId: scopeId ? Number(scopeId) : undefined,
        startsAt: startsAt || undefined,
        endsAt: endsAt || undefined,
      });
      setRoleToGrant("");
      setScopeId("");
      setStartsAt("");
      setEndsAt("");
    } catch {
      // notice is shown by parent
    } finally {
      setBusy(false);
    }
  };

  const submitRevoke = async (roleValue: string) => {
    setBusy(true);
    try {
      await onRevokeRole(roleValue);
      setConfirmRevoke(null);
    } catch {
      // notice is shown by parent
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="dialog-overlay fixed inset-0 z-[60] flex items-stretch justify-end"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Access for ${target.name}`}
        className="dialog-panel my-0 flex h-full w-full max-w-xl flex-col overflow-hidden rounded-none border-l border-border bg-[var(--surface)] shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border-secondary px-6 py-4">
          <div className="flex items-start gap-3">
            <Avatar name={target.name} photoUrl={target.photo_url} size="md" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">{target.name}</h2>
              <p className="text-sm text-muted">{target.email}</p>
              <p className="mt-0.5 text-xs text-muted">
                {[target.job_title, target.campus?.name].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-[var(--surface-secondary)] hover:text-foreground"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-foreground">Current roles</h3>
            {roles.length === 0 ? (
              <p className="mt-2 text-sm text-muted">This person has no role yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {roles.map((roleValue) => {
                  const meta = catalog.find((item) => item.value === roleValue);
                  const assignment = assignments.find((item) => item.role === roleValue);
                  return (
                    <li
                      key={roleValue}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border-secondary p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {meta?.label ?? roleValue.replace(/_/g, " ")}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {assignment
                            ? `${assignment.scope_type ?? "campus"}${
                                assignment.campus?.name ? ` · ${assignment.campus.name}` : ""
                              }`
                            : "Account role"}
                        </p>
                      </div>
                      {canEdit && !RESTRICTED_ROLES.has(roleValue) ? (
                        confirmRevoke === roleValue ? (
                          <div className="flex gap-2">
                            <Button
                              variant="danger"
                              loading={busy}
                              onClick={() => void submitRevoke(roleValue)}
                            >
                              Confirm revoke
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => setConfirmRevoke(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            onClick={() => setConfirmRevoke(roleValue)}
                          >
                            Revoke
                          </Button>
                        )
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {canEdit ? (
            <section>
              <h3 className="text-sm font-semibold text-foreground">Grant a role</h3>
              <p className="mt-0.5 text-xs text-muted">
                The person immediately receives that role&apos;s default module permissions.
              </p>
              <div className="mt-3 grid gap-3">
                <Field label="Role" htmlFor="grant_role" required>
                  <Select
                    id="grant_role"
                    value={roleToGrant}
                    onChange={(event) => setRoleToGrant(event.target.value)}
                  >
                    <option value="">Choose a role</option>
                    {available.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                {roleToGrant ? (
                  <p className="text-xs text-muted">
                    {catalog.find((item) => item.value === roleToGrant)?.description}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="text-left text-xs font-medium text-accent"
                  onClick={() => setShowAdvanced((value) => !value)}
                >
                  {showAdvanced ? "Hide scope options" : "Limit to a department, class or date range"}
                </button>
                {showAdvanced ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Campus" htmlFor="grant_campus">
                      <Select
                        id="grant_campus"
                        value={campusId}
                        onChange={(event) => setCampusId(event.target.value)}
                      >
                        <option value="">Current campus</option>
                        {campuses.map((campus) => (
                          <option key={campus.id} value={campus.id}>
                            {campus.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Scope" htmlFor="grant_scope">
                      <Select
                        id="grant_scope"
                        value={scopeType}
                        onChange={(event) => setScopeType(event.target.value)}
                      >
                        {SCOPE_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Scope ID" htmlFor="grant_scope_id" hint="Optional">
                      <TextInput
                        id="grant_scope_id"
                        type="number"
                        value={scopeId}
                        onChange={(event) => setScopeId(event.target.value)}
                      />
                    </Field>
                    <Field label="Starts" htmlFor="grant_starts">
                      <TextInput
                        id="grant_starts"
                        type="date"
                        value={startsAt}
                        onChange={(event) => setStartsAt(event.target.value)}
                      />
                    </Field>
                    <Field label="Ends" htmlFor="grant_ends">
                      <TextInput
                        id="grant_ends"
                        type="date"
                        value={endsAt}
                        onChange={(event) => setEndsAt(event.target.value)}
                      />
                    </Field>
                  </div>
                ) : null}
                <Button
                  onClick={() => void submitGrant()}
                  loading={busy}
                  disabled={!roleToGrant}
                >
                  Grant role
                </Button>
              </div>
            </section>
          ) : (
            <p className="text-xs text-muted">
              You can review this person&apos;s access, but you cannot change it.
            </p>
          )}

          <section>
            <h3 className="text-sm font-semibold text-foreground">
              Module permissions
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              Combined from every role this person currently holds.
            </p>
            {Object.keys(access).length === 0 ? (
              <p className="mt-3 text-sm text-muted">No staff-module access.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {Object.entries(access).map(([module, actions]) => (
                  <div key={module}>
                    <p className="text-xs font-medium capitalize text-foreground">
                      {formatModule(module, modules[module]?.label)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {actions.map((action) => (
                        <span
                          key={action}
                          className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] capitalize text-accent-soft-foreground"
                        >
                          {formatAction(action)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}
