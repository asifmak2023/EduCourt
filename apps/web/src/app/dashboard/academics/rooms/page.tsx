"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import type { Room } from "@/lib/types";

export default function RoomsPage() {
  return (
    <PermissionGate permission="academic.view">
      <MasterList<Room>
        title="Rooms"
        description="Physical rooms, labs and halls."
        endpoint="/v1/rooms"
        searchPlaceholder="Search name or code"
        createHref="/dashboard/academics/rooms/new"
        createPermission="academic.create"
        createLabel="New room"
        editHref={(room) => `/dashboard/academics/rooms/${room.id}/edit`}
        filters={[
          {
            param: "type",
            placeholder: "All types",
            options: [
              { value: "classroom", label: "Classroom" },
              { value: "lab", label: "Lab" },
              { value: "library", label: "Library" },
              { value: "hall", label: "Hall" },
              { value: "other", label: "Other" },
            ],
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
          { header: "Name", render: (room) => room.name },
          {
            header: "Code",
            render: (room) => (
              <span className="font-mono text-xs text-muted">
                {room.code}
              </span>
            ),
          },
          {
            header: "Type",
            render: (room) => (
              <span className="capitalize">{room.type ?? "-"}</span>
            ),
          },
          { header: "Block", render: (room) => room.block ?? "-" },
          { header: "Floor", render: (room) => room.floor ?? "-" },
          {
            header: "Capacity",
            align: "right",
            render: (room) => room.capacity ?? "-",
          },
          {
            header: "Status",
            render: (room) => (
              <Badge value={room.is_active ? "active" : "inactive"} />
            ),
          },
        ]}
      />
    </PermissionGate>
  );
}
