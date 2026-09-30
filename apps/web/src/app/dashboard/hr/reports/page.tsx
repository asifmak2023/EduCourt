"use client";

import { useState } from "react";
import { useResource } from "@/lib/useResource";
import { PermissionGate } from "@/components/PermissionGate";
import { Field, TextInput } from "@/components/Form";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/format";
import type { StaffHeadcount, StaffJoinersLeavers } from "@/lib/types";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

export default function HrReportsPage() {
  return (
    <PermissionGate permission="hr.view">
      <ReportsView />
    </PermissionGate>
  );
}

function ReportsView() {
  const [asOn, setAsOn] = useState(today());
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());

  const headcount = useResource<StaffHeadcount>(
    `/v1/staff-reports/headcount?as_on=${asOn}`
  );
  const movements = useResource<StaffJoinersLeavers>(
    from && to
      ? `/v1/staff-reports/joiners-leavers?from=${from}&to=${to}`
      : null
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR reports"
        description="Headcount and joiner/leaver movements."
      />

      <Card className="p-6">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Headcount as on" htmlFor="hc_as_on">
            <TextInput
              id="hc_as_on"
              type="date"
              value={asOn}
              onChange={(event) => setAsOn(event.target.value)}
            />
          </Field>
        </div>

        {headcount.loading ? (
          <div className="mt-4">
            <Spinner />
          </div>
        ) : headcount.error ? (
          <div className="mt-4">
            <ErrorNotice message={headcount.error} />
          </div>
        ) : headcount.data ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Employed"
                value={formatNumber(headcount.data.total)}
                hint={`As on ${formatDate(headcount.data.as_on)}`}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Breakdown
                title="By department"
                rows={headcount.data.by_department.map((row) => ({
                  label: row.department ?? "Unassigned",
                  total: row.total,
                }))}
              />
              <Breakdown
                title="By designation"
                rows={headcount.data.by_designation.map((row) => ({
                  label: row.designation ?? "Unassigned",
                  total: row.total,
                }))}
              />
              <Breakdown
                title="By status"
                rows={headcount.data.by_status.map((row) => ({
                  label: row.status,
                  total: row.total,
                }))}
              />
              <Breakdown
                title="By employment type"
                rows={headcount.data.by_employment_type.map((row) => ({
                  label: row.employment_type,
                  total: row.total,
                }))}
              />
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="From" htmlFor="jl_from">
            <TextInput
              id="jl_from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </Field>
          <Field label="To" htmlFor="jl_to">
            <TextInput
              id="jl_to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </Field>
        </div>

        {movements.loading ? (
          <div className="mt-4">
            <Spinner />
          </div>
        ) : movements.error ? (
          <div className="mt-4">
            <ErrorNotice message={movements.error} />
          </div>
        ) : movements.data ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <MovementTable
              title={`Joiners (${movements.data.joiners.length})`}
              rows={movements.data.joiners}
            />
            <MovementTable
              title={`Leavers (${movements.data.leavers.length})`}
              rows={movements.data.leavers}
            />
          </div>
        ) : null}
      </Card>
    </div>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; total: number }[];
}) {
  return (
    <div className="rounded-lg border border-border-secondary p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No data.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {rows.map((row) => (
            <li key={row.label} className="flex justify-between">
              <span className="text-muted">{row.label}</span>
              <span className="font-medium text-muted">
                {formatNumber(row.total)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MovementTable({
  title,
  rows,
}: {
  title: string;
  rows: StaffJoinersLeavers["joiners"];
}) {
  return (
    <div className="rounded-lg border border-border-secondary p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </h3>
      {rows.length === 0 ? (
        <div className="mt-2">
          <EmptyState message="No records." />
        </div>
      ) : (
        <ul className="mt-2 space-y-2 text-sm">
          {rows.map((row) => (
            <li key={row.id} className="flex justify-between gap-3">
              <span className="text-foreground">
                {row.name}
                <span className="ml-1 text-xs text-muted">
                  {row.employee_no}
                </span>
              </span>
              <span className="text-muted">{row.date ?? "-"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
