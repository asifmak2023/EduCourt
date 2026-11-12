"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { SalaryStructureForm } from "@/components/SalaryStructureForm";

export default function NewSalaryStructurePage() {
  return (
    <PermissionGate permission="payroll.create">
      <SalaryStructureForm />
    </PermissionGate>
  );
}
