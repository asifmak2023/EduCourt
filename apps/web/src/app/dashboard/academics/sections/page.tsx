"use client";

import { useClassRooms } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import type { Section } from "@/lib/types";

export default function SectionsPage() {
  return (
    <PermissionGate permission="academic.view">
      <SectionsTable />
    </PermissionGate>
  );
}

function SectionsTable() {
  const { items: classes } = useClassRooms();

  return (
    <MasterList<Section>
      title="Sections"
      description="Streams or sections inside a class."
      endpoint="/v1/sections"
      searchable={false}
      createHref="/dashboard/academics/sections/new"
      createPermission="academic.create"
      createLabel="New section"
      editHref={(section) => `/dashboard/academics/sections/${section.id}/edit`}
      filters={[
        {
          param: "class_room_id",
          placeholder: "All classes",
          options: classes.map((room) => ({
            value: String(room.id),
            label: room.name,
          })),
        },
        {
          param: "is_active",
          placeholder: "All statuses",
          options: [
            { value: "1", label: "Active" },
            { value: "0", label: "Inactive" },
          ],
        },
      ]}
      columns={[
        { header: "Name", render: (section) => section.name },
        {
          header: "Class",
          render: (section) => section.class_room?.name ?? "-",
        },
        {
          header: "Capacity",
          align: "right",
          render: (section) => section.capacity ?? "-",
        },
        {
          header: "Status",
          render: (section) => (
            <Badge value={section.is_active ? "active" : "inactive"} />
          ),
        },
      ]}
    />
  );
}
