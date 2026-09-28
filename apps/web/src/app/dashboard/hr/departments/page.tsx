"use client";

import { useAuth } from "@/lib/auth";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import type { Department } from "@/lib/types";

export default function DepartmentsPage() {
  const { can } = useAuth();

  return (
    <MasterList<Department>
      title="Departments"
      description="Organisation departments and their heads."
      endpoint="/v1/departments"
      searchable={false}
      createHref={can("hr.create") ? "/dashboard/hr/departments/new" : undefined}
      createLabel="New department"
      editHref={(item) => `/dashboard/hr/departments/${item.id}/edit`}
      filters={[
        {
          param: "is_active",
          placeholder: "Active status",
          options: [
            { value: "1", label: "Active" },
            { value: "0", label: "Inactive" },
          ],
        },
      ]}
      columns={[
        { header: "Name", render: (item) => item.name },
        { header: "Code", render: (item) => item.code },
        { header: "Head", render: (item) => item.head?.name ?? "-" },
        {
          header: "Designations",
          align: "right",
          render: (item) => formatNumber(item.designations_count ?? 0),
        },
        {
          header: "Staff",
          align: "right",
          render: (item) => formatNumber(item.staff_count ?? 0),
        },
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
