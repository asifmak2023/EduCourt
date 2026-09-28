"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import type { Period } from "@/lib/types";

export default function PeriodsPage() {
  return (
    <PermissionGate permission="academic.view">
      <MasterList<Period>
        title="Periods"
        description="Daily bell schedule used by the timetable."
        endpoint="/v1/periods"
        searchable={false}
        createHref="/dashboard/academics/periods/new"
        createPermission="academic.create"
        createLabel="New period"
        editHref={(period) => `/dashboard/academics/periods/${period.id}/edit`}
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
          { header: "Name", render: (period) => period.name },
          {
            header: "Sequence",
            align: "right",
            render: (period) => period.sequence,
          },
          { header: "Starts", render: (period) => period.starts_at ?? "-" },
          { header: "Ends", render: (period) => period.ends_at ?? "-" },
          {
            header: "Break",
            render: (period) => (period.is_break ? <Badge value="applied" /> : "-"),
          },
          {
            header: "Status",
            render: (period) => (
              <Badge value={period.is_active ? "active" : "inactive"} />
            ),
          },
        ]}
      />
    </PermissionGate>
  );
}
