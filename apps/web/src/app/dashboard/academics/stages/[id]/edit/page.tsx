"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { MasterForm } from "@/components/MasterForm";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { Stage } from "@/lib/types";

export default function EditStagePage() {
  return (
    <PermissionGate permission="academic.edit">
      <EditStageLoader />
    </PermissionGate>
  );
}

function EditStageLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<Stage>(
    id ? `/v1/stages/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Stage not found." />;

  return (
    <MasterForm
      title={`Edit ${data.name}`}
      endpoint="/v1/stages"
      recordId={data.id}
      redirectTo="/dashboard/academics/stages"
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "code", label: "Code", required: true },
        { name: "sequence", label: "Sequence", type: "number", min: "1" },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={{
        name: data.name,
        code: data.code,
        sequence: String(data.sequence),
        is_active: data.is_active,
      }}
    />
  );
}
