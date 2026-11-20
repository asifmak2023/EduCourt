"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { InstitutionsTabs } from "@/components/InstitutionsTabs";
import { currencyOptions } from "@/lib/currencies";

export default function NewInstitutionPage() {
  const currencies = currencyOptions();

  return (
    <PermissionGate permission="institution.create">
      <div className="space-y-6">
        <InstitutionsTabs active="institutions" />
        <MasterForm
          title="New institution"
          description="Create an institution that groups one or more campuses."
          endpoint="/v1/institutions"
          redirectTo="/dashboard/institutions/list"
          initial={{ is_active: true, currency: "" }}
          fields={[
            { name: "name", label: "Name", type: "text", required: true },
            { name: "code", label: "Code", type: "text" },
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
            {
              name: "currency",
              label: "Currency",
              type: "select",
              placeholder: "Use deployment default",
              options: currencies,
              hint: "Used for fee vouchers, payments and payroll defaults. Locked once financial records exist.",
            },
            { name: "is_active", label: "Active", type: "checkbox" },
          ]}
        />
      </div>
    </PermissionGate>
  );
}
