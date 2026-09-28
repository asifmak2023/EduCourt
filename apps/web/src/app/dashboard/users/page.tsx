"use client";

import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { useRoleOptions } from "@/lib/useLookups";
import type { User } from "@/lib/types";

export default function UsersPage() {
  const { items: roles } = useRoleOptions();

  return (
    <MasterList<User>
      title="Users"
      description="Staff and portal accounts with their assigned roles."
      endpoint="/v1/users"
      searchPlaceholder="Search name or email"
      createHref="/dashboard/users/new"
      createPermission="user.create"
      createLabel="New user"
      editHref={(user) => `/dashboard/users/${user.id}`}
      filters={[
        {
          param: "role",
          placeholder: "All roles",
          options: roles.map((role) => ({
            value: role.value,
            label: role.label,
          })),
        },
        {
          param: "is_active",
          placeholder: "All states",
          options: [
            { value: "1", label: "Active" },
            { value: "0", label: "Inactive" },
          ],
        },
      ]}
      columns={[
        { header: "Name", render: (user) => user.name },
        { header: "Email", render: (user) => user.email },
        {
          header: "Roles",
          render: (user) => (user.roles ?? []).join(", ") || "-",
        },
        { header: "Campus", render: (user) => user.campus?.name ?? "-" },
        {
          header: "2FA",
          render: (user) => (
            <Badge value={user.two_factor_enabled ? "enabled" : "disabled"} />
          ),
        },
        { header: "Last login", render: (user) => user.last_login_at ?? "-" },
        {
          header: "Status",
          render: (user) => (
            <Badge value={user.is_active ? "active" : "inactive"} />
          ),
        },
      ]}
    />
  );
}
