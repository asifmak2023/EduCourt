"use client";

import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { ModuleHub, type HubSection } from "@/components/ModuleHub";
import { Spinner, StatCard } from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { TransportSummary } from "@/lib/types";

export default function TransportPage() {
  return (
    <PermissionGate permission="transport.view">
      <TransportHome />
    </PermissionGate>
  );
}

const SECTIONS: HubSection[] = [
  {
    href: "/dashboard/transport/vehicles",
    title: "Vehicles",
    description: "Fleet register with capacity and driver details.",
    icon: "bus",
  },
  {
    href: "/dashboard/transport/routes",
    title: "Routes",
    description: "Routes, stops, distances and fares.",
    icon: "grid",
  },
  {
    href: "/dashboard/transport/allocations",
    title: "Allocations",
    description: "Assign students to routes and stops.",
    icon: "users",
  },
  {
    href: "/dashboard/transport/report",
    title: "Summary report",
    description: "Fleet, routes and monthly fare commitment.",
    icon: "chart",
  },
];

function TransportHome() {
  const { can } = useAuth();
  const { data, loading } = useResource<TransportSummary>(
    can("transport.export") ? "/v1/transport/reports/summary" : null
  );

  return (
    <ModuleHub
      title="Transport"
      description="Fleet, routes and student allocations."
      sections={SECTIONS}
      stats={
        loading ? (
          <Spinner />
        ) : data ? (
          <>
            <StatCard label="Vehicles" value={formatNumber(data.vehicles)} />
            <StatCard
              label="Seats"
              value={formatNumber(data.vehicle_capacity)}
            />
            <StatCard label="Routes" value={formatNumber(data.routes)} />
            <StatCard
              label="Riders"
              value={formatNumber(data.allocated_students)}
            />
            <StatCard
              label="Monthly fare"
              value={formatCurrency(data.monthly_fare)}
            />
          </>
        ) : null
      }
    />
  );
}
