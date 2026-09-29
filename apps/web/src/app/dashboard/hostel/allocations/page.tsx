"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useList";
import { useHostels } from "@/lib/useLookups";
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
import type { HostelAllocation } from "@/lib/types";

export default function HostelAllocationsPage() {
  const { can } = useAuth();
  const { items: hostels } = useHostels();
  const [hostelId, setHostelId] = useState("");
  const [status, setStatus] = useState("allocated");

  const params: Record<string, string | number> = {};
  if (hostelId) params.hostel_id = hostelId;
  if (status) params.status = status;

  const { items, meta, loading, error, page, setPage } =
    useList<HostelAllocation>("/v1/hostel-allocations", params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hostel allocations"
        description="Students placed in hostel rooms and beds."
        actions={
          can("hostel.create") ? (
            <Link
              href="/dashboard/hostel/allocations/new"
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
            value={hostelId}
            onChange={(event) => {
              setPage(1);
              setHostelId(event.target.value);
            }}
          >
            <option value="">All hostels</option>
            {hostels.map((hostel) => (
              <option key={hostel.id} value={hostel.id}>
                {hostel.name}
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
            <option value="allocated">Allocated</option>
            <option value="notice">Notice</option>
            <option value="vacated">Vacated</option>
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
                <Table.Content aria-label="Hostel allocations">
                <Table.Header>
                  <Table.Column isRowHeader>Student</Table.Column>
                  <Table.Column>Hostel</Table.Column>
                  <Table.Column>Room</Table.Column>
                  <Table.Column>Bed</Table.Column>
                  <Table.Column>Allocated</Table.Column>
                  <Table.Column>Vacated</Table.Column>
                  <Table.Column className="text-right">Fee</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                {items.map((allocation) => (
                  <Table.Row key={allocation.id} className="hover:bg-surface-secondary" id={allocation.id}>
                    <Table.Cell><Link
                        href={`/dashboard/hostel/allocations/${allocation.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {allocation.student?.full_name ??
                          `#${allocation.student_id}`}
                      </Link></Table.Cell>
                    <Table.Cell className="text-muted">{allocation.hostel?.name ?? "-"}</Table.Cell>
                    <Table.Cell className="text-muted">{allocation.room?.room_no ?? "-"}</Table.Cell>
                    <Table.Cell className="text-muted">{allocation.bed_no ?? "-"}</Table.Cell>
                    <Table.Cell className="text-muted">{allocation.allocated_on ?? "-"}</Table.Cell>
                    <Table.Cell className="text-muted">{allocation.vacated_on ?? "-"}</Table.Cell>
                    <Table.Cell className="text-right text-foreground">{formatCurrency(allocation.monthly_fee)}</Table.Cell>
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
