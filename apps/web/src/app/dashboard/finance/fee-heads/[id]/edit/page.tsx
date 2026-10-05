"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { FeeHeadForm } from "@/components/FeeHeadForm";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { FeeHead } from "@/lib/types";

export default function EditFeeHeadPage() {
  return (
    <PermissionGate permission="fee.edit">
      <EditFeeHeadLoader />
    </PermissionGate>
  );
}

function EditFeeHeadLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<FeeHead>(
    id ? `/v1/fee-heads/${id}` : null
  );

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  if (!data) {
    return <ErrorNotice message="Fee head not found." />;
  }

  return <FeeHeadForm feeHead={data} />;
}
