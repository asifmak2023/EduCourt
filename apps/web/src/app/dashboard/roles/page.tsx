"use client";

import { useState } from "react";
import { Table } from "@heroui/react";
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
                className="rounded-lg border border-border px-3 py-2"
              >
                <p className="text-sm font-medium text-foreground">
                  {role.label}
                </p>
                <p className="text-xs text-muted">{role.value}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-foreground">
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
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {group.module}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {group.permissions.map((permission) => (
                    <span
                      key={permission}
                      className="rounded-md bg-surface-secondary px-2 py-1 text-xs text-muted"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {other.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Other
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {other.map((permission) => (
                    <span
                      key={permission}
                      className="rounded-md bg-surface-secondary px-2 py-1 text-xs text-muted"
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
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
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
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Scope assignments"
                className="min-w-[880px]"
              >
                <Table.Header>
                  <Table.Column isRowHeader>Role</Table.Column>
                  <Table.Column>Scope</Table.Column>
                  <Table.Column>Campus</Table.Column>
                  <Table.Column>Valid from</Table.Column>
                  <Table.Column>Valid to</Table.Column>
                  <Table.Column>Status</Table.Column>
                  {can("role.edit") ? <Table.Column>{""}</Table.Column> : null}
                </Table.Header>
                <Table.Body>
                  {assignments.items.map((assignment) => (
                    <Table.Row key={assignment.id} id={assignment.id}>
                      <Table.Cell className="text-foreground">
                        {assignment.role_label ?? assignment.role ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {assignment.scope_type ?? "-"}
                        {assignment.scope_id ? ` #${assignment.scope_id}` : ""}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {assignment.campus?.name ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {assignment.starts_at ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {assignment.ends_at ?? "-"}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge
                          value={assignment.is_active ? "active" : "inactive"}
                        />
                      </Table.Cell>
                      {can("role.edit") ? (
                        <Table.Cell className="text-right">
                          <RevokeButton
                            assignmentId={assignment.id}
                            onRevoked={bump}
                          />
                        </Table.Cell>
                      ) : null}
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
      <h2 className="text-sm font-semibold text-foreground">
        Grant scope assignment
      </h2>
      <p className="mt-0.5 text-xs text-muted">
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
