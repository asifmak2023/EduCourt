"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { VendorForm } from "@/components/VendorForm";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { Vendor } from "@/lib/types";

export default function EditVendorPage() {
  return (
    <PermissionGate permission="finance.edit">
      <EditVendorLoader />
    </PermissionGate>
  );
}

function EditVendorLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<Vendor>(
    id ? `/v1/vendors/${id}` : null
  );

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorNotice message={error} />;
  }

  if (!data) {
    return <ErrorNotice message="Vendor not found." />;
  }

  return <VendorForm vendor={data} />;
}
