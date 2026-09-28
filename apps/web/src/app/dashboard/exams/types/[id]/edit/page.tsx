"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { MasterForm } from "@/components/MasterForm";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { ExamType } from "@/lib/types";

export default function EditExamTypePage() {
  return (
    <PermissionGate permission="exam.edit">
      <EditExamTypeLoader />
    </PermissionGate>
  );
}

function EditExamTypeLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<ExamType>(
    id ? `/v1/exam-types/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Exam type not found." />;

  return (
    <MasterForm
      title={`Edit ${data.name}`}
      endpoint="/v1/exam-types"
      recordId={data.id}
      redirectTo="/dashboard/exams/types"
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "code", label: "Code", required: true },
        {
          name: "weightage",
          label: "Weightage (%)",
          type: "number",
          step: "0.01",
          min: "0",
        },
        { name: "is_active", label: "Active", type: "checkbox" },
        { name: "description", label: "Description", span: 2 },
      ]}
      initial={{
        name: data.name,
        code: data.code,
        weightage: data.weightage ?? "",
        is_active: data.is_active,
        description: data.description ?? "",
      }}
    />
  );
}
