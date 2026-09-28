"use client";

import { useAuth } from "@/lib/auth";
import { MasterList } from "@/components/MasterList";
import { Badge } from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { TransportRoute } from "@/lib/types";

export default function TransportRoutesPage() {
  const { can } = useAuth();

  return (
    <MasterList<TransportRoute>
      title="Transport routes"
      description="Routes, stops, distances and fares."
      endpoint="/v1/transport/routes"
      searchPlaceholder="Search route name"
      createHref={
        can("transport.create") ? "/dashboard/transport/routes/new" : undefined
      }
      createLabel="New route"
      editHref={(item) => `/dashboard/transport/routes/${item.id}`}
      filters={[
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
        { header: "Route", render: (item) => item.name },
        { header: "Code", render: (item) => item.code },
        {
          header: "From",
          render: (item) => item.start_point ?? "-",
        },
        { header: "To", render: (item) => item.end_point ?? "-" },
        {
          header: "Distance",
          align: "right",
          render: (item) => `${formatNumber(item.distance_km)} km`,
        },
        {
          header: "Fare",
          align: "right",
          render: (item) => formatCurrency(item.fare),
        },
        {
          header: "Stops",
          align: "right",
          render: (item) => formatNumber(item.stops_count ?? 0),
        },
        {
          header: "Riders",
          align: "right",
          render: (item) => formatNumber(item.allocations_count ?? 0),
        },
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
