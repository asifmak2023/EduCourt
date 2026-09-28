"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { MasterForm } from "@/components/MasterForm";

export default function NewExamTypePage() {
  return (
    <PermissionGate permission="exam.create">
      <MasterForm
        title="New exam type"
        description="Define an assessment type such as mid-term or final."
        endpoint="/v1/exam-types"
        redirectTo="/dashboard/exams/types"
        submitLabel="Create type"
        fields={[
          { name: "name", label: "Name", required: true, placeholder: "Mid-term" },
          { name: "code", label: "Code", required: true, placeholder: "MID" },
          {
            name: "weightage",
            label: "Weightage (%)",
            type: "number",
            step: "0.01",
            min: "0",
          },
          { name: "is_active", label: "Active", type: "checkbox" },
          {
            name: "description",
            label: "Description",
            span: 2,
            placeholder: "Optional notes",
          },
        ]}
        initial={{
          name: "",
          code: "",
          weightage: "",
          is_active: true,
          description: "",
        }}
      />
    </PermissionGate>
  );
}
