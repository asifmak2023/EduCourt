"use client";

import { useAuth } from "@/lib/auth";
import { MasterList } from "@/components/MasterList";
import { CanteenTabs } from "@/components/CanteenTabs";
import { Badge } from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { CanteenItem } from "@/lib/types";

export default function CanteenItemsPage() {
  const { can } = useAuth();

  return (
    <div className="space-y-6">
      <CanteenTabs active="items" />
      <MasterList<CanteenItem>
        title="Menu items"
        description="Prices, costs and stock levels for canteen items."
        endpoint="/v1/canteen/items"
        searchPlaceholder="Search name or code"
        createHref={
          can("canteen.create") ? "/dashboard/canteen/items/new" : undefined
        }
        createLabel="New item"
        editHref={(item) => `/dashboard/canteen/items/${item.id}`}
        filters={[
          {
            param: "category",
            placeholder: "Category",
            options: [
              { value: "food", label: "Food" },
              { value: "drink", label: "Drink" },
              { value: "snack", label: "Snack" },
              { value: "stationery", label: "Stationery" },
              { value: "other", label: "Other" },
            ],
          },
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
          { header: "Category", render: (item) => item.category ?? "-" },
          {
            header: "Price",
            align: "right",
            render: (item) => formatCurrency(item.price),
          },
          {
            header: "Cost",
            align: "right",
            render: (item) => formatCurrency(item.cost_price),
          },
          {
            header: "Stock",
            align: "right",
            render: (item) =>
              item.track_stock
                ? `${formatNumber(item.stock_quantity)}${
                    item.unit ? ` ${item.unit}` : ""
                  }`
                : "-",
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
    </div>
  );
}
