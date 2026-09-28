"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { ExpenseCategoryForm } from "@/components/ExpenseCategoryForm";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { ExpenseCategory } from "@/lib/types";

export default function EditExpenseCategoryPage() {
  return (
    <PermissionGate permission="finance.edit">
      <EditCategoryLoader />
    </PermissionGate>
  );
}

function EditCategoryLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<ExpenseCategory>(
    id ? `/v1/expense-categories/${id}` : null
  );

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  if (!data) {
    return <ErrorNotice message="Expense category not found." />;
  }

  return <ExpenseCategoryForm category={data} />;
}
