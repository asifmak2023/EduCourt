"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { OtherIncomeForm } from "@/components/OtherIncomeForm";

export default function NewOtherIncomePage() {
  return (
    <PermissionGate permission="finance.create">
      <OtherIncomeForm />
    </PermissionGate>
  );
}
