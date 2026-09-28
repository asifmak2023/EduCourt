"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { CanteenTabs } from "@/components/CanteenTabs";

export default function NewCanteenSupplierPage() {
  return (
    <PermissionGate permission="canteen.create">
      <div className="space-y-6">
        <CanteenTabs active="suppliers" />
        <MasterForm
          title="New canteen supplier"
          description="Add a vendor that supplies the canteen."
          endpoint="/v1/canteen/suppliers"
          redirectTo="/dashboard/canteen/suppliers"
          initial={{ is_active: true }}
          fields={[
            { name: "name", label: "Name", type: "text", required: true },
            { name: "contact_person", label: "Contact person", type: "text" },
            { name: "phone", label: "Phone", type: "text" },
            { name: "email", label: "Email", type: "text" },
            { name: "address", label: "Address", type: "text", span: 2 },
            { name: "notes", label: "Notes", type: "text", span: 2 },
            { name: "is_active", label: "Active", type: "checkbox" },
          ]}
        />
      </div>
    </PermissionGate>
  );
}
