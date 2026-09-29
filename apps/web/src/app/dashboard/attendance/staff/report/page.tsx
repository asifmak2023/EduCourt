"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Table } from "@heroui/react";
import { ApiError, apiFetch } from "@/lib/api";
import { useUsers } from "@/lib/useLookups";
import { PermissionGate } from "@/components/PermissionGate";
import { Field, Select, TextInput, buttonClasses } from "@/components/Form";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
} from "@/components/ui";
import { formatNumber } from "@/lib/format";
import type { StaffAttendanceReport } from "@/lib/types";

function monthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function StaffAttendanceReportPage() {
  return (
    <PermissionGate permission="attendance.view">
      <StaffReportView />
    </PermissionGate>
  );
}

function StaffReportView() {
  const { items: users } = useUsers();

  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [userId, setUserId] = useState("");

  const [report, setReport] = useState<StaffAttendanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError(null);

      const query = new URLSearchParams({ from, to });
      if (userId) query.set("user_id", userId);

      try {
        const response = await apiFetch<{ data: StaffAttendanceReport }>(
          `/v1/attendance/staff/report?${query.toString()}`,
          { signal: controller.signal }
        );
        setReport(response.data);
      } catch (err: unknown) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setError(
            err instanceof ApiError ? err.message : "Unable to build report."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    void run();

    return () => controller.abort();
  }, [from, to, userId]);

  useEffect(() => load(), [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff attendance report"
        description="Attendance breakdown by employee for a date range."
        actions={
          <Link
            href="/dashboard/attendance"
            className={buttonClasses("secondary")}
          >
            Back
          </Link>
        }
      />

      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="From" htmlFor="staff_report_from">
            <TextInput
              id="staff_report_from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </Field>
          <Field label="To" htmlFor="staff_report_to">
            <TextInput
              id="staff_report_to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </Field>
          <Field label="Employee" htmlFor="staff_report_user">
            <Select
              id="staff_report_user"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
            >
              <option value="">All staff</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}

      {loading ? (
        <Card>
          <Spinner />
        </Card>
      ) : report ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryTile label="Present" value={report.by_status.present} />
            <SummaryTile label="Late" value={report.by_status.late} />
            <SummaryTile label="Leave" value={report.by_status.leave} />
            <SummaryTile label="Absent" value={report.by_status.absent} />
            <SummaryTile label="Excused" value={report.by_status.excused} />
          </div>

          <Card>
            {report.by_staff.length === 0 ? (
              <EmptyState message="No staff attendance was recorded in this period." />
            ) : (
              <Table variant="secondary">
                <Table.ScrollContainer>
                  <Table.Content
                    aria-label="Staff attendance report"
                    className="min-w-[760px]"
                  >
                    <Table.Header>
                      <Table.Column isRowHeader>Employee</Table.Column>
                      <Table.Column className="text-right">Present</Table.Column>
                      <Table.Column className="text-right">Late</Table.Column>
                      <Table.Column className="text-right">Leave</Table.Column>
                      <Table.Column className="text-right">Absent</Table.Column>
                      <Table.Column className="text-right">
                        Marked days
                      </Table.Column>
                    </Table.Header>
                    <Table.Body>
                      {report.by_staff.map((row) => (
                        <Table.Row key={row.user_id} id={row.user_id}>
                          <Table.Cell className="font-medium text-foreground">
                            {row.user ?? `#${row.user_id}`}
                          </Table.Cell>
                          <Table.Cell className="text-right text-muted">
                            {formatNumber(row.present)}
                          </Table.Cell>
                          <Table.Cell className="text-right text-muted">
                            {formatNumber(row.late)}
                          </Table.Cell>
                          <Table.Cell className="text-right text-muted">
                            {formatNumber(row.leave)}
                          </Table.Cell>
                          <Table.Cell className="text-right text-muted">
                            {formatNumber(row.absent)}
                          </Table.Cell>
                          <Table.Cell className="text-right text-muted">
                            {formatNumber(row.days)}
                          </Table.Cell>
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

function SummaryTile({ label, value }: { label: string; value?: number }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-foreground">
        {formatNumber(value ?? 0)}
      </p>
    </Card>
  );
}
