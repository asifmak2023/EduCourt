"use client";

import { useAuth } from "@/lib/auth";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import type { Vehicle } from "@/lib/types";

export default function VehiclesPage() {
  const { can } = useAuth();

  return (
    <MasterList<Vehicle>
      title="Vehicles"
      description="Fleet register with capacity and driver details."
      endpoint="/v1/transport/vehicles"
      searchPlaceholder="Search registration"
      createHref={
        can("transport.create") ? "/dashboard/transport/vehicles/new" : undefined
      }
      createLabel="New vehicle"
      editHref={(item) => `/dashboard/transport/vehicles/${item.id}/edit`}
      filters={[
        {
          param: "type",
          placeholder: "Type",
          options: [
            { value: "bus", label: "Bus" },
            { value: "van", label: "Van" },
            { value: "coaster", label: "Coaster" },
            { value: "car", label: "Car" },
          ],
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
        { header: "Vehicle", render: (item) => item.name },
        { header: "Registration", render: (item) => item.registration_no },
        { header: "Type", render: (item) => item.type ?? "-" },
        {
          header: "Capacity",
          align: "right",
          render: (item) => formatNumber(item.capacity),
        },
        { header: "Driver", render: (item) => item.driver_name ?? "-" },
        { header: "Phone", render: (item) => item.driver_phone ?? "-" },
        {
          header: "Status",
          render: (item) => (
            <Badge value={item.is_active ? "active" : "inactive"} />
          ),
        },
      ]}
    />
  );
}
