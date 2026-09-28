"use client";

import { useStages } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { MasterForm } from "@/components/MasterForm";
import { Spinner } from "@/components/ui";

export default function NewClassPage() {
  return (
    <PermissionGate permission="academic.create">
      <NewClassForm />
    </PermissionGate>
  );
}

function NewClassForm() {
  const { items: stages, loading } = useStages();

  if (loading) return <Spinner />;

  return (
    <MasterForm
      title="New class"
      description="Classes within each stage."
      endpoint="/v1/classes"
      redirectTo="/dashboard/academics/classes"
      submitLabel="Create class"
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
        { name: "name", label: "Name", required: true, placeholder: "Grade 1" },
        { name: "code", label: "Code", required: true, placeholder: "G1" },
        { name: "sequence", label: "Sequence", type: "number", min: "1" },
        { name: "capacity", label: "Capacity", type: "number", min: "0" },
        { name: "room", label: "Homeroom", placeholder: "Room 12" },
        { name: "is_active", label: "Active", type: "checkbox" },
      ]}
      initial={{
        stage_id: "",
        name: "",
        code: "",
        sequence: "",
        capacity: "",
        room: "",
        is_active: true,
      }}
    />
  );
}
