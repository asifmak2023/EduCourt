"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useUsers } from "@/lib/useLookups";
import { Spinner } from "@/components/ui";

export default function NewDepartmentPage() {
  const { items: users, loading } = useUsers();

  if (loading) return <Spinner />;

  return (
    <PermissionGate permission="hr.create">
      <MasterForm
        title="New department"
        description="Define an organisation department."
        endpoint="/v1/departments"
        redirectTo="/dashboard/hr/departments"
        initial={{ is_active: true }}
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
