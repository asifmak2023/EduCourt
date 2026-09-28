"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { GradeScaleForm } from "@/components/GradeScaleForm";

export default function NewGradeScalePage() {
  return (
    <PermissionGate permission="exam.create">
      <GradeScaleForm />
    </PermissionGate>
  );
}
