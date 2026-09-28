"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import {
  SALARY_CALCULATION_OPTIONS,
  SALARY_COMPONENT_TYPE_OPTIONS,
} from "@/lib/payrollOptions";

export default function NewSalaryComponentPage() {
  return (
    <PermissionGate permission="payroll.create">
      <MasterForm
        title="New salary component"
        description="Define an earning or deduction."
        endpoint="/v1/salary-components"
        redirectTo="/dashboard/hr/payroll/components"
        initial={{
          type: "earning",
          calculation: "fixed",
          sort_order: "0",
          is_taxable: false,
          is_active: true,
        }}
        fields={[
          { name: "name", label: "Name", type: "text", required: true },
          { name: "code", label: "Code", type: "text", required: true },
          {
            name: "type",
            label: "Type",
            type: "select",
            required: true,
            options: SALARY_COMPONENT_TYPE_OPTIONS,
          },
          {
            name: "calculation",
            label: "Calculation",
            type: "select",
            options: SALARY_CALCULATION_OPTIONS,
          },
          {
            name: "default_amount",
            label: "Default amount",
            type: "number",
            min: "0",
            step: "0.01",
          },
          {
            name: "default_percentage",
            label: "Default percentage",
            type: "number",
            min: "0",
            step: "0.01",
          },
          {
            name: "sort_order",
            label: "Sort order",
            type: "number",
            min: "0",
          },
          { name: "is_taxable", label: "Taxable", type: "checkbox" },
          { name: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
    </PermissionGate>
  );
}
