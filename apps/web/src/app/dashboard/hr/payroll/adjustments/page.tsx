"use client";

import { useAuth } from "@/lib/auth";
import { useStaffMembers } from "@/lib/useLookups";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { PAYROLL_ADJUSTMENT_TYPE_OPTIONS } from "@/lib/payrollOptions";
import { formatCurrency } from "@/lib/format";
import type { PayrollAdjustment } from "@/lib/types";

export default function PayrollAdjustmentsPage() {
  const { can } = useAuth();
  const { items: staff } = useStaffMembers();

  return (
    <MasterList<PayrollAdjustment>
      title="Payroll adjustments"
      description="One-off incentives, rewards and deductions per period."
      endpoint="/v1/payroll-adjustments"
      searchable={false}
      createHref={
        can("payroll.create")
          ? "/dashboard/hr/payroll/adjustments/new"
          : undefined
      }
      createLabel="New adjustment"
      editHref={(item) =>
        `/dashboard/hr/payroll/adjustments/${item.id}/edit`
      }
      filters={[
        {
          param: "staff_member_id",
          placeholder: "All staff",
          options: staff.map((member) => ({
            value: String(member.id),
            label: member.full_name,
          })),
        },
        {
          param: "type",
          placeholder: "All types",
          options: PAYROLL_ADJUSTMENT_TYPE_OPTIONS,
        },
        {
          param: "is_applied",
          placeholder: "Applied status",
          options: [
            { value: "1", label: "Applied" },
            { value: "0", label: "Not applied" },
          ],
        },
      ]}
      columns={[
        {
          header: "Staff",
          render: (item) => item.staff_member?.full_name ?? `#${item.staff_member_id}`,
        },
        {
          header: "Type",
          render: (item) => item.type_label ?? item.type ?? "-",
        },
        {
          header: "Amount",
          align: "right",
          render: (item) => formatCurrency(Number(item.amount)),
        },
        { header: "Period", render: (item) => item.period },
        { header: "Reason", render: (item) => item.reason ?? "-" },
        {
          header: "Applied",
          render: (item) => (
            <Badge value={item.is_applied ? "applied" : "pending"} />
          ),
        },
      ]}
    />
  );
}
