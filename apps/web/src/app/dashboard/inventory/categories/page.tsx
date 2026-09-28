"use client";

import { useAuth } from "@/lib/auth";
import { MasterList } from "@/components/MasterList";
import { formatNumber } from "@/lib/format";
import type { InventoryCategory } from "@/lib/types";

export default function InventoryCategoriesPage() {
  const { can } = useAuth();

  return (
    <MasterList<InventoryCategory>
      title="Inventory categories"
      description="Group store items for reporting and filters."
      endpoint="/v1/inventory/categories"
      searchPlaceholder="Search category name"
      createHref={
        can("inventory.create")
          ? "/dashboard/inventory/categories/new"
          : undefined
      }
      createLabel="New category"
      editHref={(item) => `/dashboard/inventory/categories/${item.id}/edit`}
      columns={[
        { header: "Category", render: (item) => item.name },
        { header: "Code", render: (item) => item.code ?? "-" },
        {
          header: "Description",
          render: (item) => item.description ?? "-",
        },
        {
          header: "Items",
          align: "right",
          render: (item) => formatNumber(item.items_count ?? 0),
        },
      ]}
    />
  );
}
