"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { MasterForm } from "@/components/MasterForm";

export default function NewRoomPage() {
  return (
    <PermissionGate permission="academic.create">
      <MasterForm
        title="New room"
        description="Physical rooms, labs and halls."
        endpoint="/v1/rooms"
        redirectTo="/dashboard/academics/rooms"
        submitLabel="Create room"
        fields={[
          { name: "name", label: "Name", required: true, placeholder: "Room 101" },
          { name: "code", label: "Code", required: true, placeholder: "R101" },
          { name: "block", label: "Block", placeholder: "A" },
          { name: "floor", label: "Floor", placeholder: "1" },
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
          name: "",
          code: "",
          block: "",
          floor: "",
          type: "classroom",
          capacity: "",
          is_active: true,
        }}
      />
    </PermissionGate>
  );
}
