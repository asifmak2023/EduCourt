"use client";

import { useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useList";
import {
  useCampuses,
  usePermissionCatalog,
  useRoleOptions,
  useUsers,
} from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Pagination } from "@/components/Pagination";
import {
  Button,
  Field,
  Select,
  TextInput,
} from "@/components/Form";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  SectionCard,
  Spinner,
} from "@/components/ui";
import { SCOPE_TYPE_OPTIONS } from "@/lib/rbacOptions";
import type { ScopeAssignment } from "@/lib/types";

export default function RolesPage() {
  return (
    <PermissionGate permission="role.view">
      <RolesView />
    </PermissionGate>
  );
}

function RolesView() {
  const { can } = useAuth();
  const { items: roles } = useRoleOptions();
  const permissionCatalog = usePermissionCatalog();

  const [version, setVersion] = useState(0);
  const assignments = useList<ScopeAssignment>("/v1/scope-assignments", {
    _r: version,
  });

  const bump = () => setVersion((current) => current + 1);

  const grouped = permissionCatalog.modules.map((module) => ({
    module,
    permissions: permissionCatalog.items.filter((permission) =>
      permission.startsWith(`${module}.`)
    ),
  }));
  const other = permissionCatalog.items.filter(
    (permission) =>
      !permissionCatalog.modules.some((module) =>
        permission.startsWith(`${module}.`)
      )
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & scopes"
        description="Role catalogue, permission reference and campus scope assignments."
      />

      <SectionCard title="Role catalogue">
        {roles.length === 0 ? (
          <EmptyState message="No roles available." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <div
                key={role.value}
                className="rounded-lg border border-slate-200 px-3 py-2"
              >
                <p className="text-sm font-medium text-slate-900">
                  {role.label}
                </p>
                <p className="text-xs text-slate-500">{role.value}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-900">
          Permission reference
        </h2>
        {permissionCatalog.loading ? (
          <div className="mt-4">
            <Spinner />
          </div>
        ) : permissionCatalog.error ? (
          <div className="mt-4">
            <ErrorNotice message={permissionCatalog.error} />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {grouped.map((group) => (
              <div key={group.module}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {group.module}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {group.permissions.map((permission) => (
                    <span
                      key={permission}
                      className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {other.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Other
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {other.map((permission) => (
                    <span
                      key={permission}
                      className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Card>

      {can("role.edit") ? (
        <ScopeAssignmentForm roles={roles} onCreated={bump} />
      ) : null}

      <Card>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Scope assignments
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
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Scope</th>
                <th className="px-5 py-3 font-medium">Campus</th>
                <th className="px-5 py-3 font-medium">Valid from</th>
                <th className="px-5 py-3 font-medium">Valid to</th>
                <th className="px-5 py-3 font-medium">Status</th>
                {can("role.edit") ? <th className="px-5 py-3" /> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignments.items.map((assignment) => (
                <tr key={assignment.id}>
                  <td className="px-5 py-3 text-slate-900">
                    {assignment.role_label ?? assignment.role ?? "-"}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {assignment.scope_type ?? "-"}
                    {assignment.scope_id ? ` #${assignment.scope_id}` : ""}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {assignment.campus?.name ?? "-"}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {assignment.starts_at ?? "-"}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {assignment.ends_at ?? "-"}
                  </td>
                  <td className="px-5 py-3">
                    <Badge
                      value={assignment.is_active ? "active" : "inactive"}
                    />
                  </td>
                  {can("role.edit") ? (
                    <td className="px-5 py-3 text-right">
                      <RevokeButton
                        assignmentId={assignment.id}
                        onRevoked={bump}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
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

function ScopeAssignmentForm({
  roles,
  onCreated,
}: {
  roles: { value: string; label: string }[];
  onCreated: () => void;
}) {
  const { items: users } = useUsers();
  const { items: campuses } = useCampuses();
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [campusId, setCampusId] = useState("");
  const [scopeType, setScopeType] = useState("campus");
  const [scopeId, setScopeId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
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
      onCreated();
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : "Unable to grant this scope."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold text-slate-900">
        Grant scope assignment
      </h2>
      <p className="mt-0.5 text-xs text-slate-500">
        Scope an existing account to a role within a campus. Granting the campus
        admin role is reserved for the Super User.
      </p>
      {error ? (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      ) : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <Field label="User" htmlFor="scope_user" required>
          <Select
            id="scope_user"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
          >
            <option value="">Select user</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Role" htmlFor="scope_role" required>
          <Select
            id="scope_role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="">Select role</option>
            {roles.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Campus" htmlFor="scope_campus">
          <Select
            id="scope_campus"
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
        <Field label="Scope type" htmlFor="scope_type" required>
          <Select
            id="scope_type"
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
        <Field label="Scope id" htmlFor="scope_id" hint="Optional target id">
          <TextInput
            id="scope_id"
            type="number"
            value={scopeId}
            onChange={(event) => setScopeId(event.target.value)}
          />
        </Field>
        <Field label="Starts at" htmlFor="scope_starts">
          <TextInput
            id="scope_starts"
            type="date"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
        </Field>
        <Field label="Ends at" htmlFor="scope_ends">
          <TextInput
            id="scope_ends"
            type="date"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
          />
        </Field>
      </div>
      <div className="mt-4">
        <Button onClick={submit} loading={busy} disabled={!userId || !role}>
          Grant scope
        </Button>
      </div>
    </Card>
  );
}

function RevokeButton({
  assignmentId,
  onRevoked,
}: {
  assignmentId: number;
  onRevoked: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const revoke = async () => {
    setBusy(true);
    try {
      await apiFetch(`/v1/scope-assignments/${assignmentId}`, {
        method: "DELETE",
      });
      onRevoked();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="danger" onClick={revoke} loading={busy}>
      Revoke
    </Button>
  );
}
