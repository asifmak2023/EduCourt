"use client";

import { useParams } from "next/navigation";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useResource } from "@/lib/useResource";
import { useUsers } from "@/lib/useLookups";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { Lab } from "@/lib/types";

const TYPES = [
  { value: "science", label: "Science" },
  { value: "computer", label: "Computer" },
  { value: "language", label: "Language" },
  { value: "other", label: "Other" },
];

export default function EditLabPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;

  const { data, loading, error } = useResource<Lab>(
    id ? `/v1/labs/${id}` : null
  );
  const { items: users } = useUsers();

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Lab not found." />;

  return (
    <PermissionGate permission="lab.edit">
      <MasterForm
        title="Edit lab"
        description={data.name}
        endpoint="/v1/labs"
        recordId={data.id}
        redirectTo="/dashboard/labs"
        initial={{
          name: data.name,
          code: data.code,
          type: data.type ?? "science",
          location: data.location ?? "",
          capacity: String(data.capacity),
          incharge_user_id:
            data.incharge_user_id === null ? "" : String(data.incharge_user_id),
          is_active: data.is_active,
        }}
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
