"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";

export default function NewPayrollRunPage() {
  return (
    <PermissionGate permission="payroll.create">
      <MasterForm
        title="New payroll run"
        description="Create a draft run for a month, then generate payslips."
        endpoint="/v1/payroll-runs"
        redirectTo="/dashboard/hr/payroll/runs"
        initial={{}}
        fields={[
          {
            name: "period",
            label: "Period",
            type: "text",
            required: true,
            placeholder: "YYYY-MM",
            hint: "One run per month.",
          },
          { name: "notes", label: "Notes", type: "text", span: 2 },
        ]}
      />
    </PermissionGate>
  );
}
