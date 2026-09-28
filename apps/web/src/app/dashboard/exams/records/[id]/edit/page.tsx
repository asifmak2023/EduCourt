"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { ExamForm } from "@/components/ExamForm";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { Exam } from "@/lib/types";

export default function EditExamPage() {
  return (
    <PermissionGate permission="exam.edit">
      <EditExamLoader />
    </PermissionGate>
  );
}

function EditExamLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<Exam>(
    id ? `/v1/exams/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Exam not found." />;

  return <ExamForm exam={data} />;
}
