"use client";

import { useAuth } from "@/lib/auth";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { InventoryItem } from "@/lib/types";

export default function InventoryItemsPage() {
  const { can } = useAuth();

  return (
    <MasterList<InventoryItem>
      title="Stock items"
      description="Quantities on hand, unit costs and reorder levels."
      endpoint="/v1/inventory/items"
      searchPlaceholder="Search name or code"
      createHref={
        can("inventory.create") ? "/dashboard/inventory/items/new" : undefined
      }
      createLabel="New item"
      editHref={(item) => `/dashboard/inventory/items/${item.id}`}
      filters={[
        {
          param: "low_stock",
          placeholder: "Stock level",
          options: [{ value: "1", label: "Low stock only" }],
        },
        {
          param: "is_active",
          placeholder: "Status",
          options: [
            { value: "1", label: "Active" },
            { value: "0", label: "Inactive" },
          ],
        },
      ]}
      columns={[
        { header: "Item", render: (item) => item.name },
        { header: "Code", render: (item) => item.code },
        {
          header: "Category",
          render: (item) => item.category?.name ?? "-",
        },
        {
          header: "On hand",
          align: "right",
          render: (item) =>
            `${formatNumber(item.quantity)}${
              item.unit ? ` ${item.unit}` : ""
            }`,
        },
        {
          header: "Reorder at",
          align: "right",
          render: (item) => formatNumber(item.reorder_level),
        },
        {
          header: "Unit cost",
          align: "right",
          render: (item) => formatCurrency(item.unit_cost),
        },
        {
          header: "Status",
          render: (item) =>
            item.is_low_stock ? (
              <Badge value="low stock" />
            ) : (
              <Badge value={item.is_active ? "active" : "inactive"} />
            ),
        },
      ]}
    />
  );
}
