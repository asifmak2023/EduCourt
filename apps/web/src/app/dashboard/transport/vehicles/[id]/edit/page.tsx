"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { ErrorNotice, Spinner } from "@/components/ui";
import { VEHICLE_TYPE_OPTIONS } from "@/lib/transportOptions";
import type { Vehicle } from "@/lib/types";

export default function EditVehiclePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;

  const { data, loading, error } = useResource<Vehicle>(
    id ? `/v1/transport/vehicles/${id}` : null
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Vehicle not found." />;

  return (
    <PermissionGate permission="transport.edit">
      <MasterForm
        title="Edit vehicle"
        description={data.registration_no}
        endpoint="/v1/transport/vehicles"
        recordId={data.id}
        redirectTo="/dashboard/transport/vehicles"
        initial={{
          name: data.name,
          registration_no: data.registration_no,
          type: data.type ?? "bus",
          capacity: String(data.capacity),
          model: data.model ?? "",
          driver_name: data.driver_name ?? "",
          driver_phone: data.driver_phone ?? "",
          conductor_name: data.conductor_name ?? "",
          is_active: data.is_active,
        }}
        fields={[
          { name: "name", label: "Name", type: "text", required: true },
          {
            name: "registration_no",
            label: "Registration no.",
            type: "text",
            required: true,
          },
          {
            name: "type",
            label: "Type",
            type: "select",
            options: VEHICLE_TYPE_OPTIONS,
          },
          { name: "capacity", label: "Capacity", type: "number", min: "0" },
          { name: "model", label: "Model", type: "text" },
          { name: "driver_name", label: "Driver name", type: "text" },
          { name: "driver_phone", label: "Driver phone", type: "text" },
          { name: "conductor_name", label: "Conductor name", type: "text" },
          { name: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
    </PermissionGate>
  );
}
