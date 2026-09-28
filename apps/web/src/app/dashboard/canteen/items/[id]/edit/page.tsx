"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { CanteenTabs } from "@/components/CanteenTabs";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { CanteenItem } from "@/lib/types";

export default function EditCanteenItemPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;

  const { data, loading, error } = useResource<CanteenItem>(
    id ? `/v1/canteen/items/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Item not found." />;

  return (
    <PermissionGate permission="canteen.edit">
      <div className="space-y-6">
        <CanteenTabs active="items" />
        <MasterForm
          title="Edit menu item"
          description={data.name}
          endpoint="/v1/canteen/items"
          recordId={data.id}
          redirectTo={`/dashboard/canteen/items/${data.id}`}
          initial={{
            name: data.name,
            code: data.code,
            category: data.category ?? "",
            unit: data.unit ?? "",
            price: String(data.price),
            cost_price: String(data.cost_price),
            track_stock: data.track_stock,
            stock_quantity: String(data.stock_quantity),
            reorder_level: String(data.reorder_level),
            description: data.description ?? "",
            is_active: data.is_active,
          }}
          fields={[
            { name: "name", label: "Name", type: "text", required: true },
            { name: "code", label: "Code", type: "text", required: true },
            { name: "category", label: "Category", type: "text" },
            { name: "unit", label: "Unit", type: "text" },
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
              label: "Stock quantity",
              type: "number",
              hint: "Prefer the stock adjustment action to change stock.",
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
