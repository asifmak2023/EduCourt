"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { BudgetForm } from "@/components/BudgetForm";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { Budget } from "@/lib/types";

export default function EditBudgetPage() {
  return (
    <PermissionGate permission="finance.edit">
      <EditBudgetLoader />
    </PermissionGate>
  );
}

function EditBudgetLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<Budget>(
    id ? `/v1/budgets/${id}` : null
  );

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  if (!data) {
    return <ErrorNotice message="Budget not found." />;
  }

  if (data.status !== "draft") {
    return <ErrorNotice message="Only draft budgets can be edited." />;
  }

  return <BudgetForm budget={data} />;
}
