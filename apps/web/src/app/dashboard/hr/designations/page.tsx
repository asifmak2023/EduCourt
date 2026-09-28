"use client";

import { useAuth } from "@/lib/auth";
import { useDepartments } from "@/lib/useLookups";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import type { Designation } from "@/lib/types";

export default function DesignationsPage() {
  const { can } = useAuth();
  const { items: departments } = useDepartments();

  return (
    <MasterList<Designation>
      title="Designations"
      description="Job titles, grades and descriptions."
      endpoint="/v1/designations"
      searchable={false}
      createHref={can("hr.create") ? "/dashboard/hr/designations/new" : undefined}
      createLabel="New designation"
      editHref={(item) => `/dashboard/hr/designations/${item.id}/edit`}
      filters={[
        {
          param: "department_id",
          placeholder: "All departments",
          options: departments.map((department) => ({
            value: String(department.id),
            label: department.name,
          })),
        },
      ]}
      columns={[
        { header: "Name", render: (item) => item.name },
        { header: "Code", render: (item) => item.code },
        {
          header: "Department",
          render: (item) => item.department?.name ?? "-",
        },
        { header: "Grade", render: (item) => item.grade ?? "-" },
        {
          header: "Active",
          render: (item) => (
            <Badge value={item.is_active ? "active" : "inactive"} />
          ),
        },
      ]}
    />
  );
}
