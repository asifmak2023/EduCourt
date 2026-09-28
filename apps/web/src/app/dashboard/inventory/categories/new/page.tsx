"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";

export default function NewInventoryCategoryPage() {
  return (
    <PermissionGate permission="inventory.create">
      <MasterForm
        title="New inventory category"
        description="Group store items for reporting and filters."
        endpoint="/v1/inventory/categories"
        redirectTo="/dashboard/inventory/categories"
        initial={{}}
        fields={[
          { name: "name", label: "Name", type: "text", required: true },
          { name: "code", label: "Code", type: "text" },
          {
            name: "description",
            label: "Description",
            type: "text",
            span: 2,
          },
        ]}
      />
    </PermissionGate>
  );
}
