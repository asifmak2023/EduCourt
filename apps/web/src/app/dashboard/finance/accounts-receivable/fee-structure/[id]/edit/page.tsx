"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { FeeStructureForm } from "@/components/FeeStructureForm";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { FeeStructure } from "@/lib/types";

export default function EditFeeStructurePage() {
  return (
    <PermissionGate permission="fee.edit">
      <EditFeeStructureLoader />
    </PermissionGate>
  );
}

function EditFeeStructureLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<FeeStructure>(
    id ? `/v1/fee-structures/${id}` : null
  );

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  if (!data) {
    return <ErrorNotice message="Fee structure not found." />;
  }

  return <FeeStructureForm feeStructure={data} />;
}
