"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/PermissionGate";
import { StaffSalaryForm } from "@/components/StaffSalaryForm";
import { useResource } from "@/lib/useResource";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { StaffSalary } from "@/lib/types";

export default function EditStaffSalaryPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;

  const { data, loading, error } = useResource<StaffSalary>(
    id ? `/v1/staff-salaries/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Salary structure not found." />;

  return (
    <PermissionGate permission="payroll.edit">
      <StaffSalaryForm recordId={data.id} initial={data} />
    </PermissionGate>
  );
}
