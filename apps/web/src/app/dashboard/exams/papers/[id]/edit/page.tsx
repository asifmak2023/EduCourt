"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { ExamPaperForm } from "@/components/ExamPaperForm";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { ExamPaper } from "@/lib/types";

export default function EditExamPaperPage() {
  return (
    <PermissionGate permission="exam.edit">
      <EditExamPaperLoader />
    </PermissionGate>
  );
}

function EditExamPaperLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<ExamPaper>(
    id ? `/v1/exam-papers/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Exam paper not found." />;

  return <ExamPaperForm paper={data} />;
}
