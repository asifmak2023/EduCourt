"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { MasterForm } from "@/components/MasterForm";

export default function NewSubjectPage() {
  return (
    <PermissionGate permission="academic.create">
      <MasterForm
        title="New subject"
        description="Subjects taught, with type and credit hours."
        endpoint="/v1/subjects"
        redirectTo="/dashboard/academics/subjects"
        submitLabel="Create subject"
        fields={[
          { name: "name", label: "Name", required: true, placeholder: "Mathematics" },
          { name: "code", label: "Code", required: true, placeholder: "MATH" },
          {
            name: "type",
            label: "Type",
            type: "select",
            options: [
              { value: "core", label: "Core" },
              { value: "elective", label: "Elective" },
              { value: "optional", label: "Optional" },
            ],
          },
          {
            name: "credit_hours",
            label: "Credit hours",
            type: "number",
            min: "0",
            step: "0.5",
          },
          {
            name: "weekly_periods",
            label: "Weekly periods",
            type: "number",
            min: "0",
          },
          { name: "is_active", label: "Active", type: "checkbox" },
        ]}
        initial={{
          name: "",
          code: "",
          type: "core",
          credit_hours: "",
          weekly_periods: "",
          is_active: true,
        }}
      />
    </PermissionGate>
  );
}
