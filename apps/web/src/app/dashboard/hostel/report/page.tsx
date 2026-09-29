"use client";

import { useState } from "react";
import { Table } from "@heroui/react";
import { useResource } from "@/lib/useResource";
import { useHostels } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Button, Select } from "@/components/Form";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";
import { formatNumber } from "@/lib/format";
import type { HostelSummary } from "@/lib/types";

export default function HostelReportPage() {
  return (
    <PermissionGate permission="hostel.export">
      <ReportView />
    </PermissionGate>
  );
}

function ReportView() {
  const { items: hostels } = useHostels();
  const [hostelId, setHostelId] = useState("");
  const effective = hostelId || (hostels.length > 0 ? String(hostels[0].id) : "");

  const { data, loading, error, reload } = useResource<HostelSummary>(
    effective ? `/v1/hostels/${effective}/reports/summary` : null
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hostel summary"
        description="Occupancy and pending outpasses for a hostel."
        actions={
          <Button type="button" variant="secondary" onClick={() => reload()}>
            Refresh
          </Button>
        }
      />

      <div className="w-72">
        <Select
          value={effective}
          onChange={(event) => setHostelId(event.target.value)}
        >
          <option value="">Select hostel</option>
          {hostels.map((hostel) => (
            <option key={hostel.id} value={hostel.id}>
              {hostel.name}
            </option>
          ))}
        </Select>
      </div>

      {hostels.length === 0 ? (
        <EmptyState message="No hostels configured yet." />
      ) : loading ? (
        <Spinner />
      ) : error ? (
        <ErrorNotice message={error} />
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Rooms" value={formatNumber(data.rooms)} />
            <StatCard label="Capacity" value={formatNumber(data.capacity)} />
            <StatCard
              label="Occupied"
              value={formatNumber(data.occupied)}
              hint={`${formatNumber(data.available)} beds free`}
            />
            <StatCard
              label="Pending outpasses"
              value={formatNumber(data.pending_outpasses)}
              tone={data.pending_outpasses > 0 ? "danger" : "positive"}
            />
          </div>

          <Card>
            <div className="border-b border-border-secondary px-5 py-4">
              <h2 className="text-sm font-semibold text-foreground">
                Rooms by type
              </h2>
            </div>
            {Object.keys(data.by_type).length === 0 ? (
              <div className="p-6">
                <EmptyState message="No rooms recorded." />
              </div>
            ) : (
              <Table variant="secondary">
                <Table.ScrollContainer>
                  <Table.Content aria-label="Rooms by type">
                  <Table.Header>
                    <Table.Column isRowHeader>Type</Table.Column>
                    <Table.Column className="text-right">Rooms</Table.Column>
                  </Table.Header>
                  <Table.Body>
                  {Object.entries(data.by_type).map(([type, count]) => (
                    <Table.Row key={type} id={type}>
                      <Table.Cell className="text-foreground">{type}</Table.Cell>
                      <Table.Cell className="text-right text-muted">{formatNumber(count)}</Table.Cell>
                    </Table.Row>
                  ))}
                  </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
