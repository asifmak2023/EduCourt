"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { useAuth } from "@/lib/auth";
import { useList } from "@/lib/useList";
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
import type { HostelOutpass } from "@/lib/types";

export default function HostelOutpassesPage() {
  const { can } = useAuth();
  const [status, setStatus] = useState("pending");

  const params: Record<string, string | number> = {};
  if (status) params.status = status;

  const { items, meta, loading, error, page, setPage } =
    useList<HostelOutpass>("/v1/hostel-outpasses", params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hostel outpasses"
        description="Requests for boarders to leave the hostel and their return."
        actions={
          can("hostel.create") ? (
            <Link
              href="/dashboard/hostel/outpasses/new"
              className={buttonClasses()}
            >
              New outpass
            </Link>
          ) : null
        }
      />

      <div className="w-52">
        <Select
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="returned">Returned</option>
        </Select>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No outpasses match your filters." />
        ) : (
          <div className="overflow-x-auto">
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label="Outpasses">
                <Table.Header>
                  <Table.Column isRowHeader>Student</Table.Column>
                  <Table.Column>From</Table.Column>
                  <Table.Column>To</Table.Column>
                  <Table.Column>Reason</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                {items.map((outpass) => (
                  <Table.Row key={outpass.id} className="hover:bg-surface-secondary" id={outpass.id}>
                    <Table.Cell><Link
                        href={`/dashboard/hostel/outpasses/${outpass.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {outpass.student?.full_name ??
                          `#${outpass.student_id}`}
                      </Link></Table.Cell>
                    <Table.Cell className="text-muted">{outpass.from_datetime ?? "-"}</Table.Cell>
                    <Table.Cell className="text-muted">{outpass.to_datetime ?? "-"}</Table.Cell>
                    <Table.Cell className="text-muted">{outpass.reason}</Table.Cell>
                    <Table.Cell><Badge value={outpass.status ?? "unknown"} /></Table.Cell>
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
