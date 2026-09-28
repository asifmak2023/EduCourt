"use client";

import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { PermissionGate } from "@/components/PermissionGate";
import type { ExamType } from "@/lib/types";

export default function ExamTypesPage() {
  return (
    <PermissionGate permission="exam.view">
      <MasterList<ExamType>
        title="Exam types"
        description="Assessment types such as mid-term or final."
        endpoint="/v1/exam-types"
        createHref="/dashboard/exams/types/new"
        createPermission="exam.create"
        createLabel="New type"
        editHref={(item) => `/dashboard/exams/types/${item.id}/edit`}
        filters={[
          {
            param: "is_active",
            placeholder: "All statuses",
            options: [
              { value: "1", label: "Active" },
              { value: "0", label: "Inactive" },
            ],
          },
        ]}
        columns={[
          { header: "Name", render: (item) => item.name },
          { header: "Code", render: (item) => item.code },
          {
            header: "Weightage",
            render: (item) => item.weightage ?? "-",
          },
          {
            header: "Status",
            render: (item) => (
              <Badge value={item.is_active ? "active" : "inactive"} />
            ),
          },
          {
            header: "Description",
            render: (item) => item.description ?? "-",
          },
        ]}
      />
    </PermissionGate>
  );
}
