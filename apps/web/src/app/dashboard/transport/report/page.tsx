"use client";

import { Table } from "@heroui/react";
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
        <div className="border-b border-border-secondary px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            Routes and ridership
          </h2>
        </div>
        {data.routes_detail.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No routes configured." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label="Routes and ridership">
                <Table.Header>
                  <Table.Column isRowHeader>Route</Table.Column>
                  <Table.Column>Code</Table.Column>
                  <Table.Column className="text-right">Stops</Table.Column>
                  <Table.Column className="text-right">Riders</Table.Column>
                </Table.Header>
                <Table.Body>
                {data.routes_detail.map((route) => (
                  <Table.Row key={route.id} id={route.id}>
                    <Table.Cell className="text-foreground">{route.name}</Table.Cell>
                    <Table.Cell className="text-muted">{route.code}</Table.Cell>
                    <Table.Cell className="text-right text-muted">{formatNumber(route.stops)}</Table.Cell>
                    <Table.Cell className="text-right text-foreground">{formatNumber(route.allocations)}</Table.Cell>
                  </Table.Row>
                ))}
                </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
