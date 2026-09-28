"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useInventoryCategories } from "@/lib/useLookups";

export default function NewInventoryItemPage() {
  const { items: categories } = useInventoryCategories();

  return (
    <PermissionGate permission="inventory.create">
      <MasterForm
        title="New stock item"
        description="Add an item to the campus store."
        endpoint="/v1/inventory/items"
        redirectTo="/dashboard/inventory/items"
        initial={{
          unit: "pcs",
          unit_cost: "0",
          quantity: "0",
          reorder_level: "0",
          is_active: true,
        }}
        fields={[
          { name: "name", label: "Name", type: "text", required: true },
          { name: "code", label: "Code", type: "text", required: true },
          {
            name: "inventory_category_id",
            label: "Category",
            type: "select",
            placeholder: "Uncategorised",
            options: categories.map((category) => ({
              value: String(category.id),
              label: category.name,
            })),
          },
          { name: "unit", label: "Unit", type: "text", placeholder: "pcs" },
          {
            name: "unit_cost",
            label: "Unit cost",
            type: "number",
            min: "0",
            step: "0.01",
          },
          {
            name: "quantity",
            label: "Opening quantity",
            type: "number",
            hint: "Record further stock through movements.",
          },
          { name: "reorder_level", label: "Reorder level", type: "number", min: "0" },
          { name: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
    </PermissionGate>
  );
}
