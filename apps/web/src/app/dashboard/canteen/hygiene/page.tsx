"use client";

import { CanteenTabs } from "@/components/CanteenTabs";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { HYGIENE_STATUS_OPTIONS } from "@/lib/canteenOptions";
import type { CanteenHygieneCheck } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default function CanteenHygienePage() {
  return (
    <div className="space-y-6">
      <CanteenTabs active="hygiene" />
      <MasterList<CanteenHygieneCheck>
        title="Hygiene checks"
        description="Routine inspections of the canteen premises."
        endpoint="/v1/canteen/hygiene-checks"
        searchable={false}
        createHref="/dashboard/canteen/hygiene/new"
        createPermission="canteen.create"
        createLabel="New check"
        editHref={(check) => `/dashboard/canteen/hygiene/${check.id}/edit`}
        filters={[
          {
            param: "status",
            placeholder: "All statuses",
            options: HYGIENE_STATUS_OPTIONS,
          },
        ]}
        columns={[
          { header: "Area", render: (check) => check.area },
          {
            header: "Date",
            render: (check) => formatDate(check.check_date),
          },
          {
            header: "Status",
            render: (check) => <Badge value={check.status ?? "unknown"} />,
          },
          {
            header: "Score",
            align: "right",
            render: (check) => check.score ?? "-",
          },
          {
            header: "Remarks",
            render: (check) => check.remarks ?? "-",
          },
        ]}
      />
    </div>
  );
}
