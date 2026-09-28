"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { MasterForm } from "@/components/MasterForm";

export default function NewStagePage() {
  return (
    <PermissionGate permission="academic.create">
      <MasterForm
        title="New stage"
        description="Education levels such as primary or secondary."
        endpoint="/v1/stages"
        redirectTo="/dashboard/academics/stages"
        submitLabel="Create stage"
        fields={[
          { name: "name", label: "Name", required: true, placeholder: "Primary" },
          { name: "code", label: "Code", required: true, placeholder: "PRI" },
          { name: "sequence", label: "Sequence", type: "number", min: "1" },
          { name: "is_active", label: "Active", type: "checkbox" },
        ]}
        initial={{ name: "", code: "", sequence: "", is_active: true }}
      />
    </PermissionGate>
  );
}
