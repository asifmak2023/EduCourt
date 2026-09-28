"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { Expense } from "@/lib/types";

export default function EditExpensePage() {
  return (
    <PermissionGate permission="finance.edit">
      <EditExpenseLoader />
    </PermissionGate>
  );
}

function EditExpenseLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<Expense>(
    id ? `/v1/expenses/${id}` : null
  );

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  if (!data) {
    return <ErrorNotice message="Expense not found." />;
  }

  if (data.status !== "draft") {
    return <ErrorNotice message="Only draft expenses can be edited." />;
  }

  return <ExpenseForm expense={data} />;
}
