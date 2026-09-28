"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { HOSTEL_TYPE_OPTIONS } from "@/lib/hostelOptions";

export default function NewHostelPage() {
  return (
    <PermissionGate permission="hostel.create">
      <MasterForm
        title="New hostel"
        description="Add a boarding house to the campus."
        endpoint="/v1/hostels"
        redirectTo="/dashboard/hostel"
        initial={{ type: "boys", capacity: "0", is_active: true }}
        fields={[
          { name: "name", label: "Name", type: "text", required: true },
          { name: "code", label: "Code", type: "text", required: true },
          {
            name: "type",
            label: "Type",
            type: "select",
            options: HOSTEL_TYPE_OPTIONS,
          },
          { name: "warden_name", label: "Warden name", type: "text" },
          { name: "warden_phone", label: "Warden phone", type: "text" },
          {
            name: "capacity",
            label: "Capacity",
            type: "number",
            min: "0",
            hint: "Total beds across all rooms.",
          },
          { name: "address", label: "Address", type: "text", span: 2 },
          { name: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
    </PermissionGate>
  );
}
