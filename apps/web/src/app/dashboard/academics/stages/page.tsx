"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import type { Stage } from "@/lib/types";

export default function StagesPage() {
  return (
    <PermissionGate permission="academic.view">
      <MasterList<Stage>
        title="Stages"
        description="Education levels such as primary or secondary."
        endpoint="/v1/stages"
        searchPlaceholder="Search name or code"
        createHref="/dashboard/academics/stages/new"
        createPermission="academic.create"
        createLabel="New stage"
        editHref={(stage) => `/dashboard/academics/stages/${stage.id}/edit`}
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
          { header: "Name", render: (stage) => stage.name },
          {
            header: "Code",
            render: (stage) => (
              <span className="font-mono text-xs text-slate-500">
                {stage.code}
              </span>
            ),
          },
          {
            header: "Sequence",
            align: "right",
            render: (stage) => stage.sequence,
          },
          {
            header: "Status",
            render: (stage) => (
              <Badge value={stage.is_active ? "active" : "inactive"} />
            ),
          },
        ]}
      />
    </PermissionGate>
  );
}
