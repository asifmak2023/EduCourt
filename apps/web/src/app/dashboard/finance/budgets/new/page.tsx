"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { BudgetForm } from "@/components/BudgetForm";

export default function NewBudgetPage() {
  return (
    <PermissionGate permission="finance.create">
      <BudgetForm />
    </PermissionGate>
  );
}
