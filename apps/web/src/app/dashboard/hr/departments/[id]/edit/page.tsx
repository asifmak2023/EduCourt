"use client";

import { useParams } from "next/navigation";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useResource } from "@/lib/useResource";
import { useUsers } from "@/lib/useLookups";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { Department } from "@/lib/types";

export default function EditDepartmentPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;

  const { data, loading, error } = useResource<Department>(
    id ? `/v1/departments/${id}` : null
  );
  const { items: users, loading: loadingUsers } = useUsers();

  if (loading || loadingUsers) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Department not found." />;

  return (
    <PermissionGate permission="hr.edit">
      <MasterForm
        title="Edit department"
        description={data.name}
        endpoint="/v1/departments"
        recordId={data.id}
        redirectTo="/dashboard/hr/departments"
        initial={{
          name: data.name,
          code: data.code,
          head_user_id: data.head?.id === undefined ? "" : String(data.head.id),
          description: data.description ?? "",
          is_active: data.is_active,
        }}
        fields={[
          { name: "name", label: "Name", type: "text", required: true },
          { name: "code", label: "Code", type: "text", required: true },
          {
            name: "head_user_id",
            label: "Head",
            type: "select",
            placeholder: "Optional",
            options: users.map((user) => ({
              value: String(user.id),
              label: user.name,
            })),
          },
          { name: "description", label: "Description", type: "text", span: 2 },
          { name: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
    </PermissionGate>
  );
}
