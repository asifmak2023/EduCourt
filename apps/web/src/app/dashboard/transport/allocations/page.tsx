"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
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
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label="Transport allocations">
                <Table.Header>
                  <Table.Column isRowHeader>Student</Table.Column>
                  <Table.Column>Route</Table.Column>
                  <Table.Column>Stop</Table.Column>
                  <Table.Column>Direction</Table.Column>
                  <Table.Column>From</Table.Column>
                  <Table.Column>To</Table.Column>
                  <Table.Column className="text-right">Fare</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                {items.map((allocation) => (
                  <Table.Row key={allocation.id} className="hover:bg-surface-secondary" id={allocation.id}>
                    <Table.Cell><Link
                        href={`/dashboard/transport/allocations/${allocation.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {allocation.student?.full_name ??
                          `#${allocation.student_id}`}
                      </Link></Table.Cell>
                    <Table.Cell className="text-muted">{allocation.route?.name ?? `#${allocation.transport_route_id}`}</Table.Cell>
                    <Table.Cell className="text-muted">{allocation.stop?.name ?? "-"}</Table.Cell>
                    <Table.Cell className="text-muted">{allocation.direction ?? "-"}</Table.Cell>
                    <Table.Cell className="text-muted">{allocation.start_date ?? "-"}</Table.Cell>
                    <Table.Cell className="text-muted">{allocation.end_date ?? "-"}</Table.Cell>
                    <Table.Cell className="text-right text-foreground">{formatCurrency(allocation.fare)}</Table.Cell>
                    <Table.Cell><Badge value={allocation.status ?? "unknown"} /></Table.Cell>
                  </Table.Row>
                ))}
                </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
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
