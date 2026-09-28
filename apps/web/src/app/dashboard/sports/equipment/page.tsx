"use client";

import { SportsTabs } from "@/components/SportsTabs";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { useSports } from "@/lib/useLookups";
import { EQUIPMENT_CONDITION_OPTIONS } from "@/lib/sportsOptions";
import type { SportEquipment } from "@/lib/types";

export default function SportEquipmentPage() {
  const { items: sports } = useSports();

  return (
    <div className="space-y-6">
      <SportsTabs active="equipment" />
      <MasterList<SportEquipment>
        title="Equipment"
        description="Track owned, issued and damaged sporting equipment."
        endpoint="/v1/sports/equipment"
        searchable={false}
        createHref="/dashboard/sports/equipment/new"
        createPermission="sports.create"
        createLabel="New equipment"
        editHref={(equipment) =>
          `/dashboard/sports/equipment/${equipment.id}`
        }
        filters={[
          {
            param: "sport_id",
            placeholder: "All sports",
            options: sports.map((sport) => ({
              value: String(sport.id),
              label: sport.name,
            })),
          },
          {
            param: "condition",
            placeholder: "All conditions",
            options: EQUIPMENT_CONDITION_OPTIONS,
          },
          {
            param: "out_of_stock",
            placeholder: "Stock",
            options: [{ value: "1", label: "Out of stock only" }],
          },
        ]}
        columns={[
          { header: "Equipment", render: (equipment) => equipment.name },
          { header: "Sport", render: (equipment) => equipment.sport?.name ?? "-" },
          {
            header: "Owned",
            align: "right",
            render: (equipment) => equipment.quantity,
          },
          {
            header: "Available",
            align: "right",
            render: (equipment) => equipment.available_quantity,
          },
          {
            header: "Condition",
            render: (equipment) => (
              <Badge value={equipment.condition ?? "unknown"} />
            ),
          },
          {
            header: "Status",
            render: (equipment) =>
              equipment.is_out_of_stock ? (
                <Badge value="out of stock" />
              ) : (
                <Badge value={equipment.is_active ? "active" : "inactive"} />
              ),
          },
        ]}
      />
    </div>
  );
}
