"use client";

import { useState } from "react";
import { PermissionGate } from "@/components/PermissionGate";
import { ReportsTabs } from "@/components/ReportsTabs";
import { BreakdownCard } from "@/components/ReportBreakdown";
import { Field, TextInput } from "@/components/Form";
import {
  Card,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { useReport } from "@/lib/useReport";
import type { ReportStaff } from "@/lib/types";

export default function StaffReportPage() {
  return (
    <PermissionGate permission="report.view">
      <StaffReport />
    </PermissionGate>
  );
}

function StaffReport() {
  const [asOn, setAsOn] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params = new URLSearchParams();
  if (asOn) params.set("as_on", asOn);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();

  const { data, loading, error } = useReport<ReportStaff>(
    `/v1/reports/staff${query ? `?${query}` : ""}`
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff report"
        description="Headcount, staff attendance and leave for a period."
      />
      <ReportsTabs active="staff" />

      <Card className="p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="As on" htmlFor="staff_as_on">
            <TextInput
              id="staff_as_on"
              type="date"
              value={asOn}
              onChange={(event) => setAsOn(event.target.value)}
            />
          </Field>
          <Field label="From" htmlFor="staff_from">
            <TextInput
              id="staff_from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </Field>
          <Field label="To" htmlFor="staff_to">
            <TextInput
              id="staff_to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </Field>
        </div>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}
      {loading ? (
        <Spinner />
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Headcount"
              value={formatNumber(data.headcount.total)}
              hint={`As on ${data.filters.as_on}`}
            />
            <StatCard
              label="Attendance records"
              value={formatNumber(data.attendance.total)}
            />
            <StatCard
              label="Leave requests"
              value={formatNumber(data.leave.total)}
            />
            <StatCard
              label="Approved leave days"
              value={formatNumber(data.leave.approved_days)}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <BreakdownCard
              title="Headcount by department"
              rows={data.headcount.by_department.map((row) => [
                row.department ?? "Unassigned",
                formatNumber(row.total),
              ])}
            />
            <BreakdownCard
              title="Headcount by employment type"
              rows={data.headcount.by_employment_type.map((row) => [
                row.employment_type ?? "Unspecified",
                formatNumber(row.total),
              ])}
            />
            <BreakdownCard
              title="Staff attendance by status"
              rows={data.attendance.by_status.map((row) => [
                row.status ?? "Unknown",
                formatNumber(row.total),
              ])}
            />
            <BreakdownCard
              title="Leave by status"
              rows={data.leave.by_status.map((row) => [
                row.status ?? "Unknown",
                formatNumber(row.total),
              ])}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
