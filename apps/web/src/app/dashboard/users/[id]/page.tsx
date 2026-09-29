"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  DataItem,
  DataList,
  EmptyState,
  ErrorNotice,
  PageHeader,
  SectionCard,
  Spinner,
} from "@/components/ui";
import type { User } from "@/lib/types";

export default function UserDetailPage() {
  return (
    <PermissionGate permission="user.view">
      <UserDetailView />
    </PermissionGate>
  );
}

function UserDetailView() {
  const params = useParams<{ id: string }>();
  const { can } = useAuth();
  const { data, loading, error } = useResource<User>(
    params?.id ? `/v1/users/${params.id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="User not found." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.name}
        description={data.email}
        actions={
          <>
            {can("user.edit") ? (
              <Link
                href={`/dashboard/users/${data.id}/edit`}
                className={buttonClasses("secondary")}
              >
                Edit
              </Link>
            ) : null}
            <Link href="/dashboard/users" className={buttonClasses("secondary")}>
              Back
            </Link>
          </>
        }
      />

      <SectionCard title="Account">
        <DataList>
          <DataItem label="Email" value={data.email} />
          <DataItem label="Phone" value={data.phone ?? "-"} />
          <DataItem label="Employee code" value={data.employee_code ?? "-"} />
          <DataItem label="Job title" value={data.job_title ?? "-"} />
          <DataItem label="Campus" value={data.campus?.name ?? "-"} />
          <DataItem label="Institution" value={data.institution?.name ?? "-"} />
          <DataItem
            label="Status"
            value={<Badge value={data.is_active ? "active" : "inactive"} />}
          />
          <DataItem
            label="Two factor"
            value={
              <Badge value={data.two_factor_enabled ? "enabled" : "disabled"} />
            }
          />
          <DataItem label="Last login" value={data.last_login_at ?? "-"} />
        </DataList>
      </SectionCard>

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-foreground">Roles</h2>
        {data.roles && data.roles.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {data.roles.map((role) => (
              <Badge key={role} value={role} />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">No roles assigned.</p>
        )}
      </Card>

      {data.permissions && data.permissions.length > 0 ? (
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-foreground">
            Effective permissions
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.permissions.map((permission) => (
              <span
                key={permission}
                className="rounded-md bg-surface-secondary px-2 py-1 text-xs text-muted"
              >
                {permission}
              </span>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
