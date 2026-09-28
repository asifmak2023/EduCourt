"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { GradeScaleForm } from "@/components/GradeScaleForm";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { GradeScale } from "@/lib/types";

export default function EditGradeScalePage() {
  return (
    <PermissionGate permission="exam.edit">
      <EditGradeScaleLoader />
    </PermissionGate>
  );
}

function EditGradeScaleLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<GradeScale>(
    id ? `/v1/grade-scales/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Grade scale not found." />;

  return <GradeScaleForm scale={data} />;
}
