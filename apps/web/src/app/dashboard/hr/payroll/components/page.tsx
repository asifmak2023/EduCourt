"use client";

import { useAuth } from "@/lib/auth";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { SALARY_COMPONENT_TYPE_OPTIONS } from "@/lib/payrollOptions";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { SalaryComponent } from "@/lib/types";

function defaultValue(component: SalaryComponent) {
  if (component.calculation === "percentage_of_basic") {
    return `${formatNumber(Number(component.default_percentage ?? 0))}%`;
  }
  return formatCurrency(Number(component.default_amount ?? 0));
}

export default function SalaryComponentsPage() {
  const { can } = useAuth();

  return (
    <MasterList<SalaryComponent>
      title="Salary components"
      description="Earnings and deductions that make up a salary."
      endpoint="/v1/salary-components"
      searchable={false}
      createHref={
        can("payroll.create")
          ? "/dashboard/hr/payroll/components/new"
          : undefined
      }
      createLabel="New component"
      editHref={(item) =>
        `/dashboard/hr/payroll/components/${item.id}/edit`
      }
      filters={[
        {
          param: "type",
          placeholder: "All types",
          options: SALARY_COMPONENT_TYPE_OPTIONS,
        },
      ]}
      columns={[
        { header: "Name", render: (item) => item.name },
        { header: "Code", render: (item) => item.code },
        {
          header: "Type",
          render: (item) => (
            <Badge value={item.type ?? "unknown"} />
          ),
        },
        {
          header: "Calculation",
          render: (item) =>
            item.calculation === "percentage_of_basic"
              ? "Percentage of basic"
              : "Fixed amount",
        },
        {
          header: "Default",
          align: "right",
          render: (item) => defaultValue(item),
        },
        {
          header: "Taxable",
          render: (item) => (item.is_taxable ? "Yes" : "No"),
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
