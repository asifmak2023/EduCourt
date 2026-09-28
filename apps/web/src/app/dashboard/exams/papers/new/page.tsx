"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { ExamPaperForm } from "@/components/ExamPaperForm";

export default function NewExamPaperPage() {
  return (
    <PermissionGate permission="exam.create">
      <ExamPaperForm />
    </PermissionGate>
  );
}
