"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { useVehicles } from "@/lib/useLookups";

export default function NewTransportRoutePage() {
  const { items: vehicles } = useVehicles();

  return (
    <PermissionGate permission="transport.create">
      <MasterForm
        title="New transport route"
        description="Define a route, its fare and vehicle."
        endpoint="/v1/transport/routes"
        redirectTo="/dashboard/transport/routes"
        initial={{ distance_km: "0", fare: "0", is_active: true }}
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
