"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { FeePlanForm } from "@/components/FeePlanForm";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { FeePlan } from "@/lib/types";

export default function EditFeePlanPage() {
  return (
    <PermissionGate permission="fee.edit">
      <EditFeePlanLoader />
    </PermissionGate>
  );
}

function EditFeePlanLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<FeePlan>(
    id ? `/v1/fee-plans/${id}` : null
  );

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  if (!data) {
    return <ErrorNotice message="Fee plan not found." />;
  }

  return <FeePlanForm feePlan={data} />;
}
