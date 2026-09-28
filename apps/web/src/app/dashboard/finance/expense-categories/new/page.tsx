"use client";

import { PermissionGate } from "@/components/PermissionGate";
import { ExpenseCategoryForm } from "@/components/ExpenseCategoryForm";

export default function NewExpenseCategoryPage() {
  return (
    <PermissionGate permission="finance.create">
      <ExpenseCategoryForm />
    </PermissionGate>
  );
}
