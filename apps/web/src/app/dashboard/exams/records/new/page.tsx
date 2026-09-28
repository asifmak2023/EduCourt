"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { ExamForm } from "@/components/ExamForm";

export default function NewExamPage() {
  return (
    <PermissionGate permission="exam.create">
      <ExamForm />
    </PermissionGate>
  );
}
