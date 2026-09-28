"use client";

import { useStages } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import type { ClassRoom } from "@/lib/types";

export default function ClassesPage() {
  return (
    <PermissionGate permission="academic.view">
      <ClassesTable />
    </PermissionGate>
  );
}

function ClassesTable() {
  const { items: stages } = useStages();

  return (
    <MasterList<ClassRoom>
      title="Classes"
      description="Classes within each stage."
      endpoint="/v1/classes"
      searchPlaceholder="Search name or code"
      createHref="/dashboard/academics/classes/new"
      createPermission="academic.create"
      createLabel="New class"
      editHref={(room) => `/dashboard/academics/classes/${room.id}/edit`}
      filters={[
        {
          param: "stage_id",
          placeholder: "All stages",
          options: stages.map((stage) => ({
            value: String(stage.id),
            label: stage.name,
          })),
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
        { header: "Name", render: (room) => room.name },
        {
          header: "Stage",
          render: (room) => room.stage?.name ?? "-",
        },
        {
          header: "Code",
          render: (room) => (
            <span className="font-mono text-xs text-slate-500">
              {room.code}
            </span>
          ),
        },
        {
          header: "Sections",
          align: "right",
          render: (room) => room.sections?.length ?? 0,
        },
        {
          header: "Capacity",
          align: "right",
          render: (room) => room.capacity ?? "-",
        },
        {
          header: "Status",
          render: (room) => (
            <Badge value={room.is_active ? "active" : "inactive"} />
          ),
        },
      ]}
    />
  );
}
