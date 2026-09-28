"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { CanteenTabs } from "@/components/CanteenTabs";
import { ErrorNotice, Spinner } from "@/components/ui";
import type { CanteenSupplier } from "@/lib/types";

export default function EditCanteenSupplierPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;

  const { data, loading, error } = useResource<CanteenSupplier>(
    id ? `/v1/canteen/suppliers/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Supplier not found." />;

  return (
    <PermissionGate permission="canteen.edit">
      <div className="space-y-6">
        <CanteenTabs active="suppliers" />
        <MasterForm
          title="Edit canteen supplier"
          description={data.name}
          endpoint="/v1/canteen/suppliers"
          recordId={data.id}
          redirectTo="/dashboard/canteen/suppliers"
          initial={{
            name: data.name,
            contact_person: data.contact_person ?? "",
            phone: data.phone ?? "",
            email: data.email ?? "",
            address: data.address ?? "",
            notes: data.notes ?? "",
            is_active: data.is_active,
          }}
          fields={[
            { name: "name", label: "Name", type: "text", required: true },
            { name: "contact_person", label: "Contact person", type: "text" },
            { name: "phone", label: "Phone", type: "text" },
            { name: "email", label: "Email", type: "text" },
            { name: "address", label: "Address", type: "text", span: 2 },
            { name: "notes", label: "Notes", type: "text", span: 2 },
            { name: "is_active", label: "Active", type: "checkbox" },
          ]}
        />
      </div>
    </PermissionGate>
  );
}
