"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { useStages } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { MasterForm } from "@/components/MasterForm";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { ClassRoom } from "@/lib/types";

export default function EditClassPage() {
  return (
    <PermissionGate permission="academic.edit">
      <EditClassLoader />
    </PermissionGate>
  );
}

function EditClassLoader() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { data, loading, error } = useResource<ClassRoom>(
    id ? `/v1/classes/${id}` : null
  );
  const { items: stages, loading: stagesLoading } = useStages();

  if (loading || stagesLoading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Class not found." />;

  return (
    <MasterForm
      title={`Edit ${data.name}`}
      endpoint="/v1/classes"
      recordId={data.id}
      redirectTo="/dashboard/academics/classes"
      fields={[
        {
          name: "stage_id",
          label: "Stage",
          type: "select",
          required: true,
          options: stages.map((stage) => ({
            value: String(stage.id),
            label: stage.name,
          })),
        },
        { name: "name", label: "Name", required: true },
        { name: "code", label: "Code", required: true },
        { name: "sequence", label: "Sequence", type: "number", min: "1" },
        { name: "capacity", label: "Capacity", type: "number", min: "0" },
        { name: "room", label: "Homeroom" },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={{
        stage_id: String(data.stage_id),
        name: data.name,
        code: data.code,
        sequence: String(data.sequence),
        capacity: data.capacity === null ? "" : String(data.capacity),
        room: data.room ?? "",
        is_active: data.is_active,
      }}
    />
  );
}
