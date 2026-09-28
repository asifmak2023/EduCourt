"use client";

import { useAuth } from "@/lib/auth";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { PayrollRun } from "@/lib/types";

export default function PayrollRunsPage() {
  const { can } = useAuth();

  return (
    <MasterList<PayrollRun>
      title="Payroll runs"
      description="Monthly payroll: generate, approve and pay."
      endpoint="/v1/payroll-runs"
      searchable={false}
      createHref={
        can("payroll.create") ? "/dashboard/hr/payroll/runs/new" : undefined
      }
      createLabel="New run"
      editHref={(item) => `/dashboard/hr/payroll/runs/${item.id}`}
      filters={[
        {
          param: "status",
          placeholder: "All statuses",
          options: [
            { value: "draft", label: "Draft" },
            { value: "approved", label: "Approved" },
            { value: "paid", label: "Paid" },
            { value: "cancelled", label: "Cancelled" },
          ],
        },
      ]}
      columns={[
        { header: "Period", render: (item) => item.period },
        {
          header: "Status",
          render: (item) => (
            <Badge value={item.status ?? "unknown"} />
          ),
        },
        {
          header: "Payslips",
          align: "right",
          render: (item) => formatNumber(item.payslips_count ?? 0),
        },
        {
          header: "Gross",
          align: "right",
          render: (item) => formatCurrency(Number(item.total_gross)),
        },
        {
          header: "Deductions",
          align: "right",
          render: (item) => formatCurrency(Number(item.total_deductions)),
        },
        {
          header: "Net",
          align: "right",
          render: (item) => formatCurrency(Number(item.total_net)),
        },
        { header: "Paid", render: (item) => item.paid_at ?? "-" },
      ]}
    />
  );
}
