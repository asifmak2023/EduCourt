"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { AcademicYearForm } from "@/components/AcademicYearForm";

export default function NewAcademicYearPage() {
  return (
    <PermissionGate permission="academic.create">
      <AcademicYearForm />
    </PermissionGate>
  );
}
