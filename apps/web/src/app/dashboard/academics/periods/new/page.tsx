"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { MasterForm } from "@/components/MasterForm";

export default function NewPeriodPage() {
  return (
    <PermissionGate permission="academic.create">
      <MasterForm
        title="New period"
        description="Daily bell schedule used by the timetable."
        endpoint="/v1/periods"
        redirectTo="/dashboard/academics/periods"
        submitLabel="Create period"
        fields={[
          { name: "name", label: "Name", required: true, placeholder: "Period 1" },
          { name: "sequence", label: "Sequence", type: "number", min: "1", required: true },
          { name: "starts_at", label: "Starts at", type: "time", required: true },
          { name: "ends_at", label: "Ends at", type: "time", required: true },
          { name: "is_break", label: "Break period", type: "checkbox" },
          { name: "is_active", label: "Active", type: "checkbox" },
        ]}
        initial={{
          name: "",
          sequence: "",
          starts_at: "",
          ends_at: "",
          is_break: false,
          is_active: true,
        }}
      />
    </PermissionGate>
  );
}
