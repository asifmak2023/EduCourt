"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { CanteenTabs } from "@/components/CanteenTabs";

export default function NewCanteenItemPage() {
  return (
    <PermissionGate permission="canteen.create">
      <div className="space-y-6">
        <CanteenTabs active="items" />
        <MasterForm
          title="New menu item"
          description="Add an item to the canteen menu."
          endpoint="/v1/canteen/items"
          redirectTo="/dashboard/canteen/items"
          initial={{
            unit: "pcs",
            price: "0",
            cost_price: "0",
            track_stock: true,
            stock_quantity: "0",
            reorder_level: "0",
            is_active: true,
          }}
          fields={[
            { name: "name", label: "Name", type: "text", required: true },
            { name: "code", label: "Code", type: "text", required: true },
            { name: "category", label: "Category", type: "text" },
            { name: "unit", label: "Unit", type: "text", placeholder: "pcs" },
            {
              name: "price",
              label: "Sale price",
              type: "number",
              required: true,
              min: "0",
              step: "0.01",
            },
            {
              name: "cost_price",
              label: "Cost price",
              type: "number",
              min: "0",
              step: "0.01",
            },
            { name: "track_stock", label: "Track stock", type: "checkbox" },
            {
              name: "stock_quantity",
              label: "Opening stock",
              type: "number",
            },
            {
              name: "reorder_level",
              label: "Reorder level",
              type: "number",
              min: "0",
            },
            {
              name: "description",
              label: "Description",
              type: "text",
              span: 2,
            },
            { name: "is_active", label: "Active", type: "checkbox" },
          ]}
        />
      </div>
    </PermissionGate>
  );
}
