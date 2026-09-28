"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { AcademicYearForm } from "@/components/AcademicYearForm";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { AcademicYear } from "@/lib/types";

export default function EditAcademicYearPage() {
  return (
    <PermissionGate permission="academic.edit">
      <EditYearLoader />
    </PermissionGate>
  );
}

function EditYearLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<AcademicYear>(
    id ? `/v1/academic-years/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Academic year not found." />;

  return <AcademicYearForm year={data} />;
}
