"use client";

import { useParams } from "next/navigation";
import { useResource } from "@/lib/useResource";
import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { ErrorNotice, Spinner } from "@/components/ui";
import { useVehicles } from "@/lib/useLookups";
import type { TransportRoute } from "@/lib/types";

export default function EditTransportRoutePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? Number(params.id) : undefined;

  const { data, loading, error } = useResource<TransportRoute>(
    id ? `/v1/transport/routes/${id}` : null
  );
  const { items: vehicles } = useVehicles();

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <ErrorNotice message="Route not found." />;

  return (
    <PermissionGate permission="transport.edit">
      <MasterForm
        title="Edit transport route"
        description={data.code}
        endpoint="/v1/transport/routes"
        recordId={data.id}
        redirectTo={`/dashboard/transport/routes/${data.id}`}
        initial={{
          name: data.name,
          code: data.code,
          start_point: data.start_point ?? "",
          end_point: data.end_point ?? "",
          distance_km: String(data.distance_km),
          fare: String(data.fare),
          vehicle_id: data.vehicle_id ? String(data.vehicle_id) : "",
          is_active: data.is_active,
        }}
        fields={[
          { name: "name", label: "Name", type: "text", required: true },
          { name: "code", label: "Code", type: "text", required: true },
          { name: "start_point", label: "Start point", type: "text" },
          { name: "end_point", label: "End point", type: "text" },
          {
            name: "distance_km",
            label: "Distance (km)",
            type: "number",
            min: "0",
            step: "0.1",
          },
          {
            name: "fare",
            label: "Base fare",
            type: "number",
            min: "0",
            step: "0.01",
          },
          {
            name: "vehicle_id",
            label: "Vehicle",
            type: "select",
            placeholder: "Unassigned",
            options: vehicles.map((vehicle) => ({
              value: String(vehicle.id),
              label: `${vehicle.name} (${vehicle.registration_no})`,
            })),
          },
          { name: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
    </PermissionGate>
  );
}
