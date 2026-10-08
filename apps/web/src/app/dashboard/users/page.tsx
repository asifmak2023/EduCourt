"use client";

import { MasterList } from "@/components/MasterList";
import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/ui";
import { useCampuses, useRoleOptions } from "@/lib/useLookups";
import { formatDateTime } from "@/lib/format";
import type { User } from "@/lib/types";

export default function UsersPage() {
  const { items: roles } = useRoleOptions();
  const { items: campuses } = useCampuses();

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
          param: "campus_id",
          placeholder: "All campuses",
          options: campuses.map((campus) => ({
            value: String(campus.id),
            label: campus.name,
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
        {
          param: "two_factor_enabled",
          placeholder: "All 2FA states",
          options: [
            { value: "1", label: "2FA enabled" },
            { value: "0", label: "2FA disabled" },
          ],
        },
        {
          param: "has_student",
          placeholder: "All account types",
          options: [
            { value: "1", label: "Linked to student" },
            { value: "0", label: "No student link" },
          ],
        },
      ]}
      columns={[
        {
          header: "Name",
          render: (user) => (
            <div className="flex items-center gap-3">
              <Avatar name={user.name} photoUrl={user.photo_url} size="sm" />
              <span>{user.name}</span>
            </div>
          ),
        },
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
        { header: "Last login", render: (user) => formatDateTime(user.last_login_at) },
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
