"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { ExpenseForm } from "@/components/ExpenseForm";

export default function NewExpensePage() {
  return (
    <PermissionGate permission="finance.create">
      <ExpenseForm />
    </PermissionGate>
  );
}
