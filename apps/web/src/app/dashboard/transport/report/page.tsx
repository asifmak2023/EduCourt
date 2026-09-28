"use client";

import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { Button } from "@/components/Form";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { TransportSummary } from "@/lib/types";

export default function TransportReportPage() {
  return (
    <PermissionGate permission="transport.export">
      <ReportView />
    </PermissionGate>
  );
}

function ReportView() {
  const { data, loading, error, reload } = useResource<TransportSummary>(
    "/v1/transport/reports/summary"
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNotice message={error} />;
  if (!data) return <EmptyState message="No summary available." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transport summary"
        description="Fleet, routes and monthly fare commitment."
        actions={
          <Button type="button" variant="secondary" onClick={() => reload()}>
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Vehicles" value={formatNumber(data.vehicles)} />
        <StatCard label="Seats" value={formatNumber(data.vehicle_capacity)} />
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

      <Card>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Routes and ridership
          </h2>
        </div>
        {data.routes_detail.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No routes configured." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Route</th>
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium text-right">Stops</th>
                  <th className="px-5 py-3 font-medium text-right">Riders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.routes_detail.map((route) => (
                  <tr key={route.id}>
                    <td className="px-5 py-3 text-slate-900">{route.name}</td>
                    <td className="px-5 py-3 text-slate-600">{route.code}</td>
                    <td className="px-5 py-3 text-right text-slate-600">
                      {formatNumber(route.stops)}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-900">
                      {formatNumber(route.allocations)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
