"use client";

import { useState } from "react";
import { PermissionGate } from "@/components/PermissionGate";
import { ReportsTabs } from "@/components/ReportsTabs";
import { BreakdownCard } from "@/components/ReportBreakdown";
import { Field, Select, TextInput } from "@/components/Form";
import {
  Card,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useAcademicYears } from "@/lib/useLookups";
import { useReport } from "@/lib/useReport";
import type { ReportProgress } from "@/lib/types";

export default function ProgressReportPage() {
  return (
    <PermissionGate permission="report.view">
      <ProgressReport />
    </PermissionGate>
  );
}

function ProgressReport() {
  const { items: academicYears } = useAcademicYears();
  const [academicYearId, setAcademicYearId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params = new URLSearchParams();
  if (academicYearId) params.set("academic_year_id", academicYearId);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const query = params.toString();

  const { data, loading, error } = useReport<ReportProgress>(
    `/v1/reports/progress${query ? `?${query}` : ""}`
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Progress report"
        description="Student, admission, enrollment and scholarship movement."
      />
      <ReportsTabs active="progress" />

      <Card className="p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Academic year" htmlFor="progress_year">
            <Select
              id="progress_year"
              value={academicYearId}
              onChange={(event) => setAcademicYearId(event.target.value)}
            >
              <option value="">All years</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="From" htmlFor="progress_from">
            <TextInput
              id="progress_from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </Field>
          <Field label="To" htmlFor="progress_to">
            <TextInput
              id="progress_to"
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
              label="Students"
              value={formatNumber(data.students.total)}
              hint={`${formatNumber(data.students.active)} active`}
            />
            <StatCard
              label="Admissions"
              value={formatNumber(data.admissions.total)}
            />
            <StatCard
              label="Enrollments"
              value={formatNumber(data.enrollments.total)}
            />
            <StatCard
              label="Active scholarships"
              value={formatNumber(data.scholarships.active_awards)}
              hint={formatCurrency(data.scholarships.total_value)}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <BreakdownCard
              title="Students by status"
              rows={data.students.by_status.map((row) => [
                row.status,
                formatNumber(row.total),
              ])}
            />
            <BreakdownCard
              title="Students by gender"
              rows={data.students.by_gender.map((row) => [
                row.gender ?? "Unspecified",
                formatNumber(row.total),
              ])}
            />
            <BreakdownCard
              title="Admissions by status"
              rows={data.admissions.by_status.map((row) => [
                row.status,
                formatNumber(row.total),
              ])}
            />
            <BreakdownCard
              title="Enrollments by status"
              rows={data.enrollments.by_status.map((row) => [
                row.status,
                formatNumber(row.total),
              ])}
            />
            <BreakdownCard
              title="Scholarships by type"
              rows={data.scholarships.by_type.map((row) => [
                row.type,
                `${formatNumber(row.awards)} awards`,
                formatCurrency(row.value),
              ])}
            />
            <BreakdownCard
              title="Academic events"
              rows={[["Total", formatNumber(data.events.total)]]}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
