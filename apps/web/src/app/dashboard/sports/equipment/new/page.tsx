"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { SportsTabs } from "@/components/SportsTabs";
import { useSports } from "@/lib/useLookups";
import { EQUIPMENT_CONDITION_OPTIONS } from "@/lib/sportsOptions";

export default function NewSportEquipmentPage() {
  const { items: sports } = useSports();

  return (
    <PermissionGate permission="sports.create">
      <div className="space-y-6">
        <SportsTabs active="equipment" />
        <MasterForm
          title="New equipment"
          description="Register a piece of sporting equipment."
          endpoint="/v1/sports/equipment"
          redirectTo="/dashboard/sports/equipment"
          initial={{ condition: "good", is_active: true }}
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
              name: "quantity",
              label: "Quantity owned",
              type: "number",
              min: "0",
            },
            {
              name: "available_quantity",
              label: "Available quantity",
              type: "number",
              min: "0",
              hint: "Defaults to the owned quantity.",
            },
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
