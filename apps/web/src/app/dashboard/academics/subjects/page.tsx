"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import type { Subject } from "@/lib/types";

export default function SubjectsPage() {
  return (
    <PermissionGate permission="academic.view">
      <MasterList<Subject>
        title="Subjects"
        description="Subjects taught, with type and credit hours."
        endpoint="/v1/subjects"
        searchPlaceholder="Search name or code"
        createHref="/dashboard/academics/subjects/new"
        createPermission="academic.create"
        createLabel="New subject"
        editHref={(subject) => `/dashboard/academics/subjects/${subject.id}/edit`}
        filters={[
          {
            param: "type",
            placeholder: "All types",
            options: [
              { value: "core", label: "Core" },
              { value: "elective", label: "Elective" },
              { value: "optional", label: "Optional" },
            ],
          },
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
          { header: "Name", render: (subject) => subject.name },
          {
            header: "Code",
            render: (subject) => (
              <span className="font-mono text-xs text-muted">
                {subject.code}
              </span>
            ),
          },
          {
            header: "Type",
            render: (subject) => (
              <span className="capitalize">{subject.type ?? "-"}</span>
            ),
          },
          {
            header: "Credit hours",
            align: "right",
            render: (subject) => subject.credit_hours ?? "-",
          },
          {
            header: "Weekly periods",
            align: "right",
            render: (subject) => subject.weekly_periods ?? "-",
          },
          {
            header: "Status",
            render: (subject) => (
              <Badge value={subject.is_active ? "active" : "inactive"} />
            ),
          },
        ]}
      />
    </PermissionGate>
  );
}
