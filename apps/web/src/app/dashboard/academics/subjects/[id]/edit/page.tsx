"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { MasterForm } from "@/components/MasterForm";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { Subject } from "@/lib/types";

export default function EditSubjectPage() {
  return (
    <PermissionGate permission="academic.edit">
      <EditSubjectLoader />
    </PermissionGate>
  );
}

function EditSubjectLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<Subject>(
    id ? `/v1/subjects/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Subject not found." />;

  return (
    <MasterForm
      title={`Edit ${data.name}`}
      endpoint="/v1/subjects"
      recordId={data.id}
      redirectTo="/dashboard/academics/subjects"
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "code", label: "Code", required: true },
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
        name: data.name,
        code: data.code,
        type: data.type ?? "core",
        credit_hours: data.credit_hours ?? "",
        weekly_periods:
          data.weekly_periods === null ? "" : String(data.weekly_periods),
        is_active: data.is_active,
      }}
    />
  );
}
