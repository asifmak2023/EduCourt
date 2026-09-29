"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { InstitutionsTabs } from "@/components/InstitutionsTabs";

export default function NewInstitutionPage() {
  return (
    <PermissionGate permission="institution.create">
      <div className="space-y-6">
        <InstitutionsTabs active="institutions" />
        <MasterForm
          title="New institution"
          description="Create an institution that groups one or more campuses."
          endpoint="/v1/institutions"
          redirectTo="/dashboard/institutions/list"
          initial={{ is_active: true }}
          fields={[
            { name: "name", label: "Name", type: "text", required: true },
            { name: "code", label: "Code", type: "text", required: true },
            { name: "legal_name", label: "Legal name", type: "text" },
            { name: "email", label: "Email", type: "text" },
            { name: "phone", label: "Phone", type: "text" },
            { name: "website", label: "Website", type: "text" },
            {
              name: "address",
              label: "Address",
              type: "textarea",
              span: 2,
            },
            { name: "is_active", label: "Active", type: "checkbox" },
          ]}
        />
      </div>
    </PermissionGate>
  );
}
