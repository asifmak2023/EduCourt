"use client";

import { MasterForm } from "@/components/MasterForm";
import { PermissionGate } from "@/components/PermissionGate";
import { VEHICLE_TYPE_OPTIONS } from "@/lib/transportOptions";

export default function NewVehiclePage() {
  return (
    <PermissionGate permission="transport.create">
      <MasterForm
        title="New vehicle"
        description="Add a vehicle to the campus fleet."
        endpoint="/v1/transport/vehicles"
        redirectTo="/dashboard/transport/vehicles"
        initial={{ type: "bus", capacity: "0", is_active: true }}
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
          {
            name: "driver_name",
            label: "Driver name",
            type: "text",
          },
          {
            name: "driver_phone",
            label: "Driver phone",
            type: "text",
          },
          { name: "conductor_name", label: "Conductor name", type: "text" },
          { name: "is_active", label: "Active", type: "checkbox" },
        ]}
      />
    </PermissionGate>
  );
}
