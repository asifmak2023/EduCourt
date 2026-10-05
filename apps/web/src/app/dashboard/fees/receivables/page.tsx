"use client";

import { useEffect, useMemo, useState } from "react";
import { Table } from "@heroui/react";
import { ApiError, apiFetch } from "@/lib/api";
import { PermissionGate } from "@/components/PermissionGate";
import { Checkbox, Field, Select, TextInput, buttonClasses } from "@/components/Form";
import {
  Badge,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAcademicYears, useClassRooms } from "@/lib/useLookups";
import type { ReceivableReport } from "@/lib/types";

export default function ReceivablesPage() {
  return (
    <PermissionGate permission="fee.view">
      <ReceivablesReport />
    </PermissionGate>
  );
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function ReceivablesReport() {
  const { items: years } = useAcademicYears();
  const { items: classes } = useClassRooms();

  const currentYearId = years.find((year) => year.is_current)?.id ?? null;

  const [yearSelection, setYearSelection] = useState<string | null>(null);
  const [classId, setClassId] = useState("");
  const [asOf, setAsOf] = useState(today);
  const [overdueOnly, setOverdueOnly] = useState(true);
  const [search, setSearch] = useState("");

  const [data, setData] = useState<ReceivableReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveYearId =
    yearSelection ?? (currentYearId !== null ? String(currentYearId) : "");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const params = new URLSearchParams();
    if (effectiveYearId) params.set("academic_year_id", effectiveYearId);
    if (classId) params.set("class_room_id", classId);
    if (asOf) params.set("as_of", asOf);
    params.set("overdue_only", overdueOnly ? "1" : "0");

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch<ReceivableReport>(
          `/v1/fee-reports/defaulters?${params.toString()}`,
          { signal: controller.signal }
        );
        if (active) {
          setData(response);
        }
      } catch (err: unknown) {
        if (!active || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        setError(
          err instanceof ApiError ? err.message : "Unable to load receivables."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [effectiveYearId, classId, asOf, overdueOnly]);

  const rows = useMemo(() => {
    const list = data?.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) {
      return list;
    }
    return list.filter(
      (row) =>
        (row.student ?? "").toLowerCase().includes(term) ||
        (row.admission_no ?? "").toLowerCase().includes(term)
    );
  }, [data, search]);

  const exportCsv = () => {
    const header = [
      "Student",
      "Roll no",
      "Class",
      "Section",
      "Vouchers",
      "Oldest due",
      "Days overdue",
      "Outstanding",
    ];
    const lines = rows.map((row) =>
      [
        row.student ?? "",
        row.admission_no ?? "",
        row.class ?? "",
        row.section ?? "",
        String(row.vouchers),
        row.oldest_due_date ?? "",
        String(row.max_days_overdue),
        row.outstanding,
      ]
        .map((value) => `"${value.replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receivables-${data?.as_of ?? today()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const buckets = data?.summary.buckets;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts receivable"
        description="Outstanding fee receivables by student, as of a chosen date."
        actions={
          <>
            <button
              type="button"
              className={buttonClasses("secondary")}
              onClick={() => window.print()}
            >
              Print
            </button>
            <button
              type="button"
              className={buttonClasses("secondary")}
              onClick={exportCsv}
              disabled={rows.length === 0}
            >
              Export CSV
            </button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total accounts receivable"
          value={formatCurrency(data?.summary.outstanding ?? "0")}
          tone="danger"
        />
        <StatCard
          label="Students with dues"
          value={data?.summary.students ?? 0}
        />
        <StatCard label="Open vouchers" value={data?.summary.vouchers ?? 0} />
      </div>

      {buckets ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Bucket label="Current" value={buckets.current} />
          <Bucket label="1-30 days" value={buckets.days_1_30} />
          <Bucket label="31-60 days" value={buckets.days_31_60} />
          <Bucket label="61-90 days" value={buckets.days_61_90} />
          <Bucket label="90+ days" value={buckets.days_over_90} />
        </div>
      ) : null}

      <Card className="p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="As of date" htmlFor="ar_asof">
            <TextInput
              id="ar_asof"
              type="date"
              value={asOf}
              onChange={(event) => setAsOf(event.target.value)}
            />
          </Field>
          <Field label="Academic year" htmlFor="ar_year">
            <Select
              id="ar_year"
              value={effectiveYearId}
              onChange={(event) => setYearSelection(event.target.value)}
            >
              <option value="">All academic years</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Class" htmlFor="ar_class">
            <Select
              id="ar_class"
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
            >
              <option value="">All classes</option>
              {classes.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Search" htmlFor="ar_search">
            <TextInput
              id="ar_search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Student or roll no"
            />
          </Field>
        </div>
        <div className="mt-3">
          <Checkbox
            label="Overdue only (exclude fees not yet due)"
            checked={overdueOnly}
            onChange={(event) => setOverdueOnly(event.target.checked)}
          />
        </div>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState message="No outstanding receivables for these filters." />
        ) : (
          <div className="overflow-x-auto">
            <Table variant="secondary">
              <Table.ScrollContainer>
                <Table.Content aria-label="Accounts receivable" className="min-w-[960px]">
                <Table.Header>
                  <Table.Column isRowHeader>Student</Table.Column>
                  <Table.Column>Roll no</Table.Column>
                  <Table.Column>Class</Table.Column>
                  <Table.Column>Section</Table.Column>
                  <Table.Column className="text-right">Vouchers</Table.Column>
                  <Table.Column>Oldest due</Table.Column>
                  <Table.Column className="text-right">Days overdue</Table.Column>
                  <Table.Column className="text-right">Outstanding</Table.Column>
                  <Table.Column>Status</Table.Column>
                </Table.Header>
                <Table.Body>
                  {rows.map((row) => (
                    <Table.Row key={`${row.student_id}-${row.class_room_id ?? 0}`} id={`${row.student_id}-${row.class_room_id ?? 0}`}>
                      <Table.Cell className="font-medium text-foreground">
                        {row.student ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="font-mono text-xs text-muted">
                        {row.admission_no ?? "-"}
                      </Table.Cell>
                      <Table.Cell className="text-muted">{row.class ?? "-"}</Table.Cell>
                      <Table.Cell className="text-muted">{row.section ?? "-"}</Table.Cell>
                      <Table.Cell className="text-right text-muted">{row.vouchers}</Table.Cell>
                      <Table.Cell className="text-muted">
                        {row.oldest_due_date ? formatDate(row.oldest_due_date) : "-"}
                      </Table.Cell>
                      <Table.Cell className="text-right text-muted">
                        {row.max_days_overdue}
                      </Table.Cell>
                      <Table.Cell className="text-right font-medium text-foreground">
                        {formatCurrency(row.outstanding)}
                      </Table.Cell>
                      <Table.Cell>
                        <Badge value={row.max_days_overdue > 0 ? "overdue" : "current"} />
                      </Table.Cell>
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

function Bucket({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-secondary px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">
        {formatCurrency(value)}
      </p>
    </div>
  );
}
