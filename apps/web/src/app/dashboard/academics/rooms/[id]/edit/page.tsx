"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { MasterForm } from "@/components/MasterForm";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { Room } from "@/lib/types";

export default function EditRoomPage() {
  return (
    <PermissionGate permission="academic.edit">
      <EditRoomLoader />
    </PermissionGate>
  );
}

function EditRoomLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<Room>(
    id ? `/v1/rooms/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Room not found." />;

  return (
    <MasterForm
      title={`Edit ${data.name}`}
      endpoint="/v1/rooms"
      recordId={data.id}
      redirectTo="/dashboard/academics/rooms"
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "code", label: "Code", required: true },
        { name: "block", label: "Block" },
        { name: "floor", label: "Floor" },
        {
          name: "type",
          label: "Type",
          type: "select",
          options: [
            { value: "classroom", label: "Classroom" },
            { value: "lab", label: "Lab" },
            { value: "library", label: "Library" },
            { value: "hall", label: "Hall" },
            { value: "other", label: "Other" },
          ],
        },
        { name: "capacity", label: "Capacity", type: "number", min: "0" },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={{
        name: data.name,
        code: data.code,
        block: data.block ?? "",
        floor: data.floor ?? "",
        type: data.type ?? "classroom",
        capacity: data.capacity === null ? "" : String(data.capacity),
        is_active: data.is_active,
      }}
    />
  );
}
