"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useStaffMembers } from "@/lib/useLookups";
import { PAYROLL_ADJUSTMENT_TYPE_OPTIONS } from "@/lib/payrollOptions";
import { Spinner } from "@/components/ui";

export default function NewPayrollAdjustmentPage() {
  const { items: staff, loading } = useStaffMembers();

  if (loading) return <Spinner />;

  return (
    <PermissionGate permission="payroll.create">
      <MasterForm
        title="New adjustment"
        description="Add an incentive, reward or deduction for a period."
        endpoint="/v1/payroll-adjustments"
        redirectTo="/dashboard/hr/payroll/adjustments"
        initial={{ type: "incentive" }}
        fields={[
          {
            name: "staff_member_id",
            label: "Staff",
            type: "select",
            required: true,
            options: staff.map((member) => ({
              value: String(member.id),
              label: `${member.full_name} (${member.employee_no})`,
            })),
          },
          {
            name: "type",
            label: "Type",
            type: "select",
            required: true,
            options: PAYROLL_ADJUSTMENT_TYPE_OPTIONS,
          },
          {
            name: "amount",
            label: "Amount",
            type: "number",
            required: true,
            min: "0",
            step: "0.01",
          },
          {
            name: "period",
            label: "Period",
            type: "text",
            required: true,
            placeholder: "YYYY-MM",
            hint: "Payroll month, e.g. 2026-09.",
          },
          { name: "reason", label: "Reason", type: "text", span: 2 },
        ]}
      />
    </PermissionGate>
  );
}
