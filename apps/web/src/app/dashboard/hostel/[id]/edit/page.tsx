"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { ErrorNotice, Spinner } from "@/components/ui";
import { HOSTEL_TYPE_OPTIONS } from "@/lib/hostelOptions";
import type { Hostel } from "@/lib/types";

export default function EditHostelPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;

  const { data, loading, error } = useResource<Hostel>(
    id ? `/v1/hostels/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Hostel not found." />;

  return (
    <PermissionGate permission="hostel.edit">
      <MasterForm
        title="Edit hostel"
        description={data.code}
        endpoint="/v1/hostels"
        recordId={data.id}
        redirectTo={`/dashboard/hostel/${data.id}`}
        initial={{
          name: data.name,
          code: data.code,
          type: data.type ?? "boys",
          warden_name: data.warden_name ?? "",
          warden_phone: data.warden_phone ?? "",
          capacity: String(data.capacity),
          address: data.address ?? "",
          is_active: data.is_active,
        }}
        fields={[
          { name: "name", label: "Name", type: "text", required: true },
          { name: "code", label: "Code", type: "text", required: true },
          {
            name: "type",
            label: "Type",
            type: "select",
            options: HOSTEL_TYPE_OPTIONS,
          },
          { name: "warden_name", label: "Warden name", type: "text" },
          { name: "warden_phone", label: "Warden phone", type: "text" },
          { name: "capacity", label: "Capacity", type: "number", min: "0" },
          { name: "address", label: "Address", type: "text", span: 2 },
          { name: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
    </PermissionGate>
  );
}
