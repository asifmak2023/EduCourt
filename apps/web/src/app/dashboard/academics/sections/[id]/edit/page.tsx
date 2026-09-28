"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { useClassRooms } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { MasterForm } from "@/components/MasterForm";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { Section } from "@/lib/types";

export default function EditSectionPage() {
  return (
    <PermissionGate permission="academic.edit">
      <EditSectionLoader />
    </PermissionGate>
  );
}

function EditSectionLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<Section>(
    id ? `/v1/sections/${id}` : null
  );
  const { items: classes, loading: classesLoading } = useClassRooms();

  if (loading || classesLoading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Section not found." />;

  return (
    <MasterForm
      title={`Edit ${data.name}`}
      endpoint="/v1/sections"
      recordId={data.id}
      redirectTo="/dashboard/academics/sections"
      fields={[
        {
          name: "class_room_id",
          label: "Class",
          type: "select",
          required: true,
          options: classes.map((room) => ({
            value: String(room.id),
            label: room.name,
          })),
        },
        { name: "name", label: "Name", required: true },
        { name: "capacity", label: "Capacity", type: "number", min: "0" },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={{
        class_room_id: String(data.class_room_id),
        name: data.name,
        capacity: data.capacity === null ? "" : String(data.capacity),
        is_active: data.is_active,
      }}
    />
  );
}
