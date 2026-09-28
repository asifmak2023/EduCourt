"use client";

import { useClassRooms } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { MasterForm } from "@/components/MasterForm";
import { Spinner } from "@/components/ui";

export default function NewSectionPage() {
  return (
    <PermissionGate permission="academic.create">
      <NewSectionForm />
    </PermissionGate>
  );
}

function NewSectionForm() {
  const { items: classes, loading } = useClassRooms();

  if (loading) return <Spinner />;

  return (
    <MasterForm
      title="New section"
      description="Streams or sections inside a class."
      endpoint="/v1/sections"
      redirectTo="/dashboard/academics/sections"
      submitLabel="Create section"
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
        { name: "name", label: "Name", required: true, placeholder: "A" },
        { name: "capacity", label: "Capacity", type: "number", min: "0" },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={{ class_room_id: "", name: "", capacity: "", is_active: true }}
    />
  );
}
