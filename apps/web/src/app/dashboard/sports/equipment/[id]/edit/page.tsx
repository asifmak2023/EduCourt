"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { SportsTabs } from "@/components/SportsTabs";
import { ErrorNotice, Spinner } from "@/components/ui";
import { useSports } from "@/lib/useLookups";
import { EQUIPMENT_CONDITION_OPTIONS } from "@/lib/sportsOptions";
import type { SportEquipment } from "@/lib/types";

export default function EditSportEquipmentPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;
  const { data, loading, error } = useResource<SportEquipment>(
    id ? `/v1/sports/equipment/${id}` : null
  );
  const { items: sports } = useSports();

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Equipment not found." />;

  return (
    <PermissionGate permission="sports.edit">
      <div className="space-y-6">
        <SportsTabs active="equipment" />
        <MasterForm
          title="Edit equipment"
          description={data.name}
          endpoint="/v1/sports/equipment"
          recordId={data.id}
          redirectTo={`/dashboard/sports/equipment/${data.id}`}
          initial={{
            sport_id: data.sport_id ? String(data.sport_id) : "",
            name: data.name,
            code: data.code,
            unit: data.unit ?? "",
            unit_cost: data.unit_cost ?? "",
            condition: data.condition ?? "",
            notes: data.notes ?? "",
            is_active: data.is_active,
          }}
          fields={[
            {
              name: "sport_id",
              label: "Sport",
              type: "select",
              placeholder: "General",
              options: sports.map((sport) => ({
                value: String(sport.id),
                label: sport.name,
              })),
            },
            { name: "name", label: "Name", type: "text", required: true },
            { name: "code", label: "Code", type: "text", required: true },
            { name: "unit", label: "Unit", type: "text" },
            {
              name: "unit_cost",
              label: "Unit cost",
              type: "number",
              min: "0",
              step: "0.01",
            },
            {
              name: "condition",
              label: "Condition",
              type: "select",
              options: EQUIPMENT_CONDITION_OPTIONS,
            },
            { name: "notes", label: "Notes", type: "text", span: 2 },
            { name: "is_active", label: "Active", type: "checkbox" },
          ]}
        />
      </div>
    </PermissionGate>
  );
}
