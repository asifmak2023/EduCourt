"use client";

import { useParams } from "next/navigation";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useResource } from "@/lib/useResource";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { LabEquipment } from "@/lib/types";

const CONDITIONS = [
  { value: "working", label: "Working" },
  { value: "under_repair", label: "Under repair" },
  { value: "damaged", label: "Damaged" },
  { value: "retired", label: "Retired" },
];

export default function EditLabEquipmentPage() {
  const params = useParams<{ id: string; equipmentId: string }>();
  const labId = params?.id;
  const equipmentId = params?.equipmentId ? Number(params.equipmentId) : undefined;

  const { data, loading, error } = useResource<LabEquipment>(
    equipmentId ? `/v1/lab-equipment/${equipmentId}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Equipment not found." />;

  return (
    <PermissionGate permission="lab.edit">
      <MasterForm
        title="Edit equipment"
        description={data.name}
        endpoint="/v1/lab-equipment"
        recordId={data.id}
        redirectTo={`/dashboard/labs/${labId}`}
        initial={{
          name: data.name,
          code: data.code ?? "",
          quantity: String(data.quantity),
          condition: data.condition ?? "working",
          purchased_on: data.purchased_on ?? "",
          notes: data.notes ?? "",
        }}
        fields={[
          { name: "name", label: "Name", type: "text", required: true },
          { name: "code", label: "Code", type: "text" },
          { name: "quantity", label: "Quantity", type: "number", min: "0" },
          {
            name: "condition",
            label: "Condition",
            type: "select",
            options: CONDITIONS,
          },
          { name: "purchased_on", label: "Purchased on", type: "date" },
          { name: "notes", label: "Notes", type: "text", span: 2 },
        ]}
      />
    </PermissionGate>
  );
}
