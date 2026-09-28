"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { CanteenTabs } from "@/components/CanteenTabs";
import { useCanteenItems, useCanteenSuppliers } from "@/lib/useLookups";
import { CANTEEN_STOCK_ENTRY_TYPE_OPTIONS } from "@/lib/canteenOptions";

export default function NewCanteenStockEntryPage() {
  const { items: canteenItems } = useCanteenItems();
  const { items: suppliers } = useCanteenSuppliers();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <PermissionGate permission="canteen.create">
      <div className="space-y-6">
        <CanteenTabs active="stock" />
        <MasterForm
          title="New stock entry"
          description="Record a purchase, wastage or return."
          endpoint="/v1/canteen/stock-entries"
          redirectTo="/dashboard/canteen/stock-entries"
          initial={{ type: "purchase", entry_date: today }}
          fields={[
            {
              name: "canteen_item_id",
              label: "Item",
              type: "select",
              required: true,
              options: canteenItems.map((item) => ({
                value: String(item.id),
                label: `${item.name} (${item.code})`,
              })),
            },
            {
              name: "type",
              label: "Type",
              type: "select",
              required: true,
              options: CANTEEN_STOCK_ENTRY_TYPE_OPTIONS,
            },
            {
              name: "supplier_id",
              label: "Supplier",
              type: "select",
              placeholder: "None",
              options: suppliers.map((supplier) => ({
                value: String(supplier.id),
                label: supplier.name,
              })),
            },
            {
              name: "quantity",
              label: "Quantity",
              type: "number",
              required: true,
            },
            {
              name: "unit_cost",
              label: "Unit cost",
              type: "number",
              min: "0",
              step: "0.01",
            },
            {
              name: "entry_date",
              label: "Entry date",
              type: "date",
            },
            { name: "reference", label: "Reference", type: "text" },
            { name: "notes", label: "Notes", type: "text", span: 2 },
          ]}
        />
      </div>
    </PermissionGate>
  );
}
