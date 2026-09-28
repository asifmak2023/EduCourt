"use client";

import { useParams } from "next/navigation";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useResource } from "@/lib/useResource";
import { useStaffMembers } from "@/lib/useLookups";
import { PAYROLL_ADJUSTMENT_TYPE_OPTIONS } from "@/lib/payrollOptions";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { PayrollAdjustment } from "@/lib/types";

export default function EditPayrollAdjustmentPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;

  const { data, loading, error } = useResource<PayrollAdjustment>(
    id ? `/v1/payroll-adjustments/${id}` : null
  );
  const { items: staff, loading: loadingStaff } = useStaffMembers();

  if (loading || loadingStaff) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Adjustment not found." />;

  if (data.is_applied) {
    return (
      <ErrorNotice message="This adjustment was applied to a payroll run and can no longer be edited." />
    );
  }

  return (
    <PermissionGate permission="payroll.edit">
      <MasterForm
        title="Edit adjustment"
        description={data.type_label ?? undefined}
        endpoint="/v1/payroll-adjustments"
        recordId={data.id}
        redirectTo="/dashboard/hr/payroll/adjustments"
        initial={{
          staff_member_id: String(data.staff_member_id),
          type: data.type ?? "incentive",
          amount: data.amount,
          period: data.period,
          reason: data.reason ?? "",
        }}
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
          },
          { name: "reason", label: "Reason", type: "text", span: 2 },
        ]}
      />
    </PermissionGate>
  );
}
