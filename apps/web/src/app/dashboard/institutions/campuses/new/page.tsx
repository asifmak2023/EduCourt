"use client";

import { useInstitutions } from "@/lib/useLookups";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { InstitutionsTabs } from "@/components/InstitutionsTabs";

const CAMPUS_TYPE_OPTIONS = [
  { value: "school", label: "School" },
  { value: "college", label: "College" },
  { value: "university", label: "University" },
];

export default function NewCampusPage() {
  const { items: institutions } = useInstitutions();

  return (
    <PermissionGate permission="campus.create">
      <div className="space-y-6">
        <InstitutionsTabs active="campuses" />
        <MasterForm
          title="New campus"
          description="Create a campus, the tenant boundary for all campus data."
          endpoint="/v1/campuses"
          redirectTo="/dashboard/institutions/campuses"
          initial={{ type: "school", is_active: true }}
          fields={[
            {
              name: "institution_id",
              label: "Institution",
              type: "select",
              required: true,
              options: institutions.map((institution) => ({
                value: String(institution.id),
                label: institution.name,
              })),
            },
            { name: "name", label: "Name", type: "text", required: true },
            { name: "code", label: "Code", type: "text", required: true },
            {
              name: "type",
              label: "Type",
              type: "select",
              required: true,
              options: CAMPUS_TYPE_OPTIONS,
            },
            { name: "email", label: "Email", type: "text" },
            { name: "phone", label: "Phone", type: "text" },
            { name: "whatsapp", label: "WhatsApp", type: "text" },
            { name: "website", label: "Website", type: "text" },
            { name: "address", label: "Address", type: "textarea", span: 2 },
            { name: "is_active", label: "Active", type: "checkbox" },
          ]}
        />
      </div>
    </PermissionGate>
  );
}
