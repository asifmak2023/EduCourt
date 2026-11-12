"use client";

import { useParams } from "next/navigation";
import { PermissionGate } from "@/components/PermissionGate";
import { SalaryStructureForm } from "@/components/SalaryStructureForm";
import { useResource } from "@/lib/useResource";
import { EmptyState, ErrorNotice, Spinner } from "@/components/ui";
import type { SalaryStructure } from "@/lib/types";

export default function EditSalaryStructurePage() {
  return (
    <PermissionGate permission="payroll.edit">
      <EditLoader />
    </PermissionGate>
  );
}

function EditLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<SalaryStructure>(
    id ? `/v1/salary-structures/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="Salary structure not found." />;

  return <SalaryStructureForm salaryStructure={data} />;
}
