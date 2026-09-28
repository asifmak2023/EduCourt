"use client";

import { PermissionGate } from "@/components/PermissionGate";
import {
  EMPTY_LESSON_PLAN,
  LessonPlanForm,
} from "@/components/LessonPlanForm";

export default function NewLessonPlanPage() {
  return (
    <PermissionGate permission="curriculum.create">
      <LessonPlanForm initial={EMPTY_LESSON_PLAN} />
    </PermissionGate>
  );
}
