"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { ErrorNotice, Spinner } from "@/components/ui";
import { useInventoryCategories } from "@/lib/useLookups";
import type { InventoryItem } from "@/lib/types";

export default function EditInventoryItemPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;

  const { data, loading, error } = useResource<InventoryItem>(
    id ? `/v1/inventory/items/${id}` : null
  );
  const { items: categories } = useInventoryCategories();

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Item not found." />;

  return (
    <PermissionGate permission="inventory.edit">
      <MasterForm
        title="Edit stock item"
        description={data.name}
        endpoint="/v1/inventory/items"
        recordId={data.id}
        redirectTo={`/dashboard/inventory/items/${data.id}`}
        initial={{
          name: data.name,
          code: data.code,
          inventory_category_id: data.inventory_category_id
            ? String(data.inventory_category_id)
            : "",
          unit: data.unit ?? "",
          unit_cost: String(data.unit_cost),
          quantity: String(data.quantity),
          reorder_level: String(data.reorder_level),
          is_active: data.is_active,
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
            label: "Quantity on hand",
            type: "number",
            hint: "Prefer recording a movement to change stock.",
          },
          { name: "reorder_level", label: "Reorder level", type: "number", min: "0" },
          { name: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
    </PermissionGate>
  );
}
