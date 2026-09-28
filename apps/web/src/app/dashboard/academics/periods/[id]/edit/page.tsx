"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { MasterForm } from "@/components/MasterForm";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { Period } from "@/lib/types";

export default function EditPeriodPage() {
  return (
    <PermissionGate permission="academic.edit">
      <EditPeriodLoader />
    </PermissionGate>
  );
}

function EditPeriodLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<Period>(
    id ? `/v1/periods/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Period not found." />;

  return (
    <MasterForm
      title={`Edit ${data.name}`}
      endpoint="/v1/periods"
      recordId={data.id}
      redirectTo="/dashboard/academics/periods"
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "sequence", label: "Sequence", type: "number", min: "1", required: true },
        { name: "starts_at", label: "Starts at", type: "time", required: true },
        { name: "ends_at", label: "Ends at", type: "time", required: true },
        { name: "is_break", label: "Break period", type: "checkbox" },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={{
        name: data.name,
        sequence: String(data.sequence),
        starts_at: data.starts_at ? data.starts_at.slice(0, 5) : "",
        ends_at: data.ends_at ? data.ends_at.slice(0, 5) : "",
        is_break: data.is_break,
        is_active: data.is_active,
      }}
    />
  );
}
