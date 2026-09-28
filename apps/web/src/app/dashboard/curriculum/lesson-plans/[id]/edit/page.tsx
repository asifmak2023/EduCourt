"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import {
  LessonPlanForm,
  lessonPlanInitial,
} from "@/components/LessonPlanForm";
import { PermissionGate } from "@/components/PermissionGate";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { LessonPlan } from "@/lib/types";

export default function EditLessonPlanPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;

  const { data, loading, error } = useResource<LessonPlan>(
    id ? `/v1/lesson-plans/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Lesson plan not found." />;

  return (
    <PermissionGate permission="curriculum.edit">
      <LessonPlanForm recordId={data.id} initial={lessonPlanInitial(data)} />
    </PermissionGate>
  );
}
