"use client";

import { UserForm } from "@/components/UserForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useRoleOptions } from "@/lib/useLookups";

export default function NewUserPage() {
  const { items: roles } = useRoleOptions();

  return (
    <PermissionGate permission="user.create">
      <UserForm
        title="New user"
        description="Provision a staff or portal account and assign roles."
        roleOptions={roles}
        redirectTo="/dashboard/users"
        initial={{
          name: "",
          email: "",
          phone: "",
          employee_code: "",
          job_title: "",
          is_active: true,
          roles: [],
        }}
      />
    </PermissionGate>
  );
}
