"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useUsers } from "@/lib/useLookups";
import { Spinner } from "@/components/ui";

const TYPES = [
  { value: "science", label: "Science" },
  { value: "computer", label: "Computer" },
  { value: "language", label: "Language" },
  { value: "other", label: "Other" },
];

export default function NewLabPage() {
  const { items: users, loading } = useUsers();

  if (loading) return <Spinner />;

  return (
    <PermissionGate permission="lab.create">
      <MasterForm
        title="New lab"
        description="Register a laboratory space."
        endpoint="/v1/labs"
        redirectTo="/dashboard/labs"
        initial={{ type: "science", capacity: "0", is_active: true }}
        fields={[
          { name: "name", label: "Name", type: "text", required: true },
          { name: "code", label: "Code", type: "text", required: true },
          { name: "type", label: "Type", type: "select", options: TYPES },
          { name: "location", label: "Location", type: "text" },
          { name: "capacity", label: "Capacity", type: "number", min: "0" },
          {
            name: "incharge_user_id",
            label: "In charge",
            type: "select",
            placeholder: "Optional",
            options: users.map((user) => ({
              value: String(user.id),
              label: user.name,
            })),
          },
          { name: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
    </PermissionGate>
  );
}
