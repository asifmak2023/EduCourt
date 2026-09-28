"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { InventoryCategory } from "@/lib/types";

export default function EditInventoryCategoryPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;

  const { data, loading, error } = useResource<InventoryCategory>(
    id ? `/v1/inventory/categories/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Category not found." />;

  return (
    <PermissionGate permission="inventory.edit">
      <MasterForm
        title="Edit inventory category"
        description={data.name}
        endpoint="/v1/inventory/categories"
        recordId={data.id}
        redirectTo="/dashboard/inventory/categories"
        initial={{
          name: data.name,
          code: data.code ?? "",
          description: data.description ?? "",
        }}
        fields={[
          { name: "name", label: "Name", type: "text", required: true },
          { name: "code", label: "Code", type: "text" },
          {
            name: "description",
            label: "Description",
            type: "text",
            span: 2,
          },
        ]}
      />
    </PermissionGate>
  );
}
