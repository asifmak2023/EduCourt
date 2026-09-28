"use client";

import { useParams } from "next/navigation";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useResource } from "@/lib/useResource";
import { useDepartments } from "@/lib/useLookups";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { Designation } from "@/lib/types";

export default function EditDesignationPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;

  const { data, loading, error } = useResource<Designation>(
    id ? `/v1/designations/${id}` : null
  );
  const { items: departments, loading: loadingDepartments } = useDepartments();

  if (loading || loadingDepartments) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Designation not found." />;

  return (
    <PermissionGate permission="hr.edit">
      <MasterForm
        title="Edit designation"
        description={data.name}
        endpoint="/v1/designations"
        recordId={data.id}
        redirectTo="/dashboard/hr/designations"
        initial={{
          name: data.name,
          code: data.code,
          department_id:
            data.department?.id === undefined ? "" : String(data.department.id),
          grade: data.grade ?? "",
          job_description: data.job_description ?? "",
          is_active: data.is_active,
        }}
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
