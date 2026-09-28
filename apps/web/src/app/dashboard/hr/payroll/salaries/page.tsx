"use client";

import { useAuth } from "@/lib/auth";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { StaffSalary } from "@/lib/types";

export default function StaffSalariesPage() {
  const { can } = useAuth();

  return (
    <MasterList<StaffSalary>
      title="Salary structures"
      description="Basic salary and component lines per staff member."
      endpoint="/v1/staff-salaries"
      searchable={false}
      createHref={
        can("payroll.create") ? "/dashboard/hr/payroll/salaries/new" : undefined
      }
      createLabel="New structure"
      editHref={(item) => `/dashboard/hr/payroll/salaries/${item.id}`}
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
        {
          header: "Staff",
          render: (item) =>
            item.staff_member?.full_name ?? `#${item.staff_member_id}`,
        },
        {
          header: "Basic",
          align: "right",
          render: (item) => formatCurrency(Number(item.basic_salary)),
        },
        { header: "Currency", render: (item) => item.currency },
        {
          header: "Effective from",
          render: (item) => item.effective_from ?? "-",
        },
        { header: "Effective to", render: (item) => item.effective_to ?? "-" },
        {
          header: "Components",
          align: "right",
          render: (item) => item.items?.length ?? 0,
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
