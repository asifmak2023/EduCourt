"use client";

import { useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { useList } from "@/lib/useList";
import { useUsers } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Pagination } from "@/components/Pagination";
import { Select, TextInput, buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { StaffAttendance } from "@/lib/types";

const STATUSES = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "leave", label: "Leave" },
  { value: "excused", label: "Excused" },
];

export default function StaffAttendancePage() {
  return (
    <PermissionGate permission="attendance.view">
      <StaffRecords />
    </PermissionGate>
  );
}

function StaffRecords() {
  const { items: users } = useUsers();

  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const [userId, setUserId] = useState("");

  const params: Record<string, string | number> = {};
  if (date) params.attendance_date = date;
  if (status) params.status = status;
  if (userId) params.user_id = Number(userId);

  const { items, meta, loading, error, page, setPage } = useList<StaffAttendance>(
    "/v1/attendance/staff",
    params
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff attendance"
        description="Daily attendance for campus staff."
        actions={
          <>
            <Link
              href="/dashboard/attendance"
              className={buttonClasses("secondary")}
            >
              Back
            </Link>
            <Link
              href="/dashboard/attendance/staff/mark"
              className={buttonClasses()}
            >
              Mark attendance
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="w-44">
          <TextInput
            type="date"
            value={date}
            onChange={(event) => {
              setPage(1);
              setDate(event.target.value);
            }}
          />
        </div>
        <div className="w-56">
          <Select
            value={userId}
            onChange={(event) => {
              setPage(1);
              setUserId(event.target.value);
            }}
          >
            <option value="">All staff</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <Select
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value);
            }}
          >
            <option value="">All statuses</option>
            {STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState message="No staff attendance records match your filters." />
        ) : (
          <Table variant="secondary">
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Staff attendance records"
                className="min-w-[900px]"
              >
                <Table.Header>
                  <Table.Column isRowHeader>Date</Table.Column>
                  <Table.Column>Employee</Table.Column>
                  <Table.Column>Status</Table.Column>
                  <Table.Column>Check in</Table.Column>
                  <Table.Column>Check out</Table.Column>
                  <Table.Column>Remarks</Table.Column>
                </Table.Header>
                <Table.Body>
                  {items.map((record) => (
                    <Table.Row key={record.id} id={record.id}>
                      <Table.Cell className="text-muted">
                        {formatDate(record.attendance_date)}
                      </Table.Cell>
                      <Table.Cell>
                        <div className="font-medium text-foreground">
                          {record.user?.name ?? `#${record.user_id}`}
                        </div>
                        {record.user?.email ? (
                          <div className="text-xs text-muted">
                            {record.user.email}
                          </div>
                        ) : null}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={record.status} />
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {record.check_in ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {record.check_out ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">
                        {record.remarks ?? "-"}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
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
