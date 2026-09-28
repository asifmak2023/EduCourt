"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { StaffSalaryForm } from "@/components/StaffSalaryForm";

export default function NewStaffSalaryPage() {
  return (
    <PermissionGate permission="payroll.create">
      <StaffSalaryForm />
    </PermissionGate>
  );
}
