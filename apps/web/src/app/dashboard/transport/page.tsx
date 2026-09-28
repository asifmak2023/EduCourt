"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { Card, PageHeader, Spinner, StatCard } from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { TransportSummary } from "@/lib/types";

export default function TransportPage() {
  return (
    <PermissionGate permission="transport.view">
      <TransportHome />
    </PermissionGate>
  );
}

const SECTIONS = [
  {
    href: "/dashboard/transport/vehicles",
    title: "Vehicles",
    description: "Fleet register with capacity and driver details.",
  },
  {
    href: "/dashboard/transport/routes",
    title: "Routes",
    description: "Routes, stops, distances and fares.",
  },
  {
    href: "/dashboard/transport/allocations",
    title: "Allocations",
    description: "Assign students to routes and stops.",
  },
  {
    href: "/dashboard/transport/report",
    title: "Summary report",
    description: "Fleet, routes and monthly fare commitment.",
  },
];

function TransportHome() {
  const { can } = useAuth();
  const { data, loading } = useResource<TransportSummary>(
    can("transport.export") ? "/v1/transport/reports/summary" : null
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transport"
        description="Fleet, routes and student allocations."
      />

      {loading ? (
        <Spinner />
      ) : data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full p-5 transition hover:border-slate-400">
              <p className="text-sm font-semibold text-slate-900">
                {section.title}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {section.description}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
