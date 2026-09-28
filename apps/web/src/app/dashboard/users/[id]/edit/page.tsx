"use client";

import { useParams } from "next/navigation";
import { UserForm } from "@/components/UserForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useRoleOptions } from "@/lib/useLookups";
import { useResource } from "@/lib/useResource";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { User } from "@/lib/types";

export default function EditUserPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;
  const { data, loading, error } = useResource<User>(
    id ? `/v1/users/${id}` : null
  );
  const { items: roles } = useRoleOptions();

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="User not found." />;

  return (
    <PermissionGate permission="user.edit">
      <UserForm
        title="Edit user"
        description={data.email}
        recordId={data.id}
        roleOptions={roles}
        redirectTo={`/dashboard/users/${data.id}`}
        initial={{
          name: data.name,
          email: data.email,
          phone: data.phone ?? "",
          employee_code: data.employee_code ?? "",
          job_title: data.job_title ?? "",
          is_active: data.is_active ?? true,
          roles: data.roles ?? [],
        }}
      />
    </PermissionGate>
  );
}
