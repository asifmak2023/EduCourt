"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Employee</th>
                      <th className="px-5 py-3 font-medium text-right">Present</th>
                      <th className="px-5 py-3 font-medium text-right">Late</th>
                      <th className="px-5 py-3 font-medium text-right">Leave</th>
                      <th className="px-5 py-3 font-medium text-right">Absent</th>
                      <th className="px-5 py-3 font-medium text-right">
                        Marked days
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.by_staff.map((row) => (
                      <tr key={row.user_id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-900">
                          {row.user ?? `#${row.user_id}`}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatNumber(row.present)}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatNumber(row.late)}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatNumber(row.leave)}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatNumber(row.absent)}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-600">
                          {formatNumber(row.days)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">
        {formatNumber(value ?? 0)}
      </p>
    </Card>
  );
}
