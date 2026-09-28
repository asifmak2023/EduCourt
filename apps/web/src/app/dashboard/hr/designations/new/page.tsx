"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useDepartments } from "@/lib/useLookups";
import { Spinner } from "@/components/ui";

export default function NewDesignationPage() {
  const { items: departments, loading } = useDepartments();

  if (loading) return <Spinner />;

  return (
    <PermissionGate permission="hr.create">
      <MasterForm
        title="New designation"
        description="Define a job title."
        endpoint="/v1/designations"
        redirectTo="/dashboard/hr/designations"
        initial={{ is_active: true }}
        fields={[
          { name: "name", label: "Name", type: "text", required: true },
          { name: "code", label: "Code", type: "text", required: true },
          {
            name: "department_id",
            label: "Department",
            type: "select",
            placeholder: "Optional",
            options: departments.map((department) => ({
              value: String(department.id),
              label: department.name,
            })),
          },
          { name: "grade", label: "Grade", type: "text" },
          {
            name: "job_description",
            label: "Job description",
            type: "text",
            span: 2,
          },
          { name: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
    </PermissionGate>
  );
}
