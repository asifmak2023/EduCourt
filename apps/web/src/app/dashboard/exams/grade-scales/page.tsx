"use client";

import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { PermissionGate } from "@/components/PermissionGate";
import type { GradeScale } from "@/lib/types";

export default function GradeScalesPage() {
  return (
    <PermissionGate permission="exam.view">
      <MasterList<GradeScale>
        title="Grade scales"
        description="Percentage bands that map to letter grades."
        endpoint="/v1/grade-scales"
        searchable={false}
        createHref="/dashboard/exams/grade-scales/new"
        createPermission="exam.create"
        createLabel="New scale"
        editHref={(item) => `/dashboard/exams/grade-scales/${item.id}/edit`}
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
            header: "Default",
            render: (item) =>
              item.is_default ? <Badge value="active" /> : "-",
          },
          {
            header: "Status",
            render: (item) => (
              <Badge value={item.is_active ? "active" : "inactive"} />
            ),
          },
          {
            header: "Bands",
            align: "right",
            render: (item) => item.items?.length ?? 0,
          },
        ]}
      />
    </PermissionGate>
  );
}
