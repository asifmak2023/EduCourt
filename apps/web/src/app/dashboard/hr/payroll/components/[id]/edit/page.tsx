"use client";

import { useParams } from "next/navigation";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useResource } from "@/lib/useResource";
import {
  SALARY_CALCULATION_OPTIONS,
  SALARY_COMPONENT_TYPE_OPTIONS,
} from "@/lib/payrollOptions";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { SalaryComponent } from "@/lib/types";

export default function EditSalaryComponentPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;

  const { data, loading, error } = useResource<SalaryComponent>(
    id ? `/v1/salary-components/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Component not found." />;

  return (
    <PermissionGate permission="payroll.edit">
      <MasterForm
        title="Edit salary component"
        description={data.name}
        endpoint="/v1/salary-components"
        recordId={data.id}
        redirectTo="/dashboard/hr/payroll/components"
        initial={{
          name: data.name,
          code: data.code,
          type: data.type ?? "earning",
          calculation: data.calculation ?? "fixed",
          default_amount: data.default_amount ?? "",
          default_percentage: data.default_percentage ?? "",
          sort_order: String(data.sort_order),
          is_taxable: data.is_taxable,
          is_active: data.is_active,
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
