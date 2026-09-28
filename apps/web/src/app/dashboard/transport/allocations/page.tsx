"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useList";
import { useTransportRoutes } from "@/lib/useLookups";
import { Pagination } from "@/components/Pagination";
import { Select, buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { TransportAllocation } from "@/lib/types";

export default function TransportAllocationsPage() {
  const { can } = useAuth();
  const { items: routes } = useTransportRoutes();
  const [routeId, setRouteId] = useState("");
  const [status, setStatus] = useState("active");

  const params: Record<string, string | number> = {};
  if (routeId) params.transport_route_id = routeId;
  if (status) params.status = status;

  const { items, meta, loading, error, page, setPage } =
    useList<TransportAllocation>("/v1/transport/allocations", params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transport allocations"
        description="Students assigned to routes and stops."
        actions={
          can("transport.create") ? (
            <Link
              href="/dashboard/transport/allocations/new"
              className={buttonClasses()}
            >
              New allocation
            </Link>
          ) : null
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-64">
          <Select
            value={routeId}
            onChange={(event) => {
              setPage(1);
              setRouteId(event.target.value);
            }}
          >
            <option value="">All routes</option>
            {routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-52">
          <Select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No allocations match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Route</th>
                  <th className="px-5 py-3 font-medium">Stop</th>
                  <th className="px-5 py-3 font-medium">Direction</th>
                  <th className="px-5 py-3 font-medium">From</th>
                  <th className="px-5 py-3 font-medium">To</th>
                  <th className="px-5 py-3 font-medium text-right">Fare</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((allocation) => (
                  <tr key={allocation.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/transport/allocations/${allocation.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {allocation.student?.full_name ??
                          `#${allocation.student_id}`}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {allocation.route?.name ?? `#${allocation.transport_route_id}`}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {allocation.stop?.name ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {allocation.direction ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {allocation.start_date ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {allocation.end_date ?? "-"}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-900">
                      {formatCurrency(allocation.fare)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge value={allocation.status ?? "unknown"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta ? (
          <Pagination
            page={page}
            lastPage={meta.last_page}
            total={meta.total}
            onPage={setPage}
          />
        ) : null}
      </Card>
    </div>
  );
}
