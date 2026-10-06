"use client";

import { useMemo, useState } from "react";
import {
  useAcademicYears,
  useClassRooms,
  useSections,
} from "@/lib/useLookups";
import { useJson } from "@/lib/useJson";
import { useAuth } from "@/lib/auth";
import { AR_VIEW } from "@/lib/permissions";
import { Button, Field, Select, TextInput } from "@/components/Form";
import { Pagination } from "@/components/Pagination";
import { PermissionGate } from "@/components/PermissionGate";
import { FeeVoucherAction } from "@/components/fee-counter/FeeVoucherAction";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Spinner,
  StatCard,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { ArReport, ArSummary } from "@/lib/types";

const BILLING_KINDS = [
  { value: "monthly", label: "Monthly Fee" },
  { value: "exam", label: "Examination Fee" },
  { value: "one_time", label: "One-time Fee" },
  { value: "other", label: "Other Charge" },
  { value: "legacy_installment", label: "Legacy Installment" },
];

const TABS = [
  { value: "", label: "All" },
  { value: "outstanding", label: "Outstanding" },
  { value: "overdue", label: "Overdue" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
];

export default function ArReportsPage() {
  return (
    <PermissionGate permission={AR_VIEW}>
      <ArReports />
    </PermissionGate>
  );
}

function ArReports() {
  const { canAny } = useAuth();
  const { items: years } = useAcademicYears();
  const { items: classes } = useClassRooms();
  const { items: sections } = useSections();

  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [billingKind, setBillingKind] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filters = useMemo(() => {
    const params = new URLSearchParams();
    if (academicYearId) params.set("academic_year_id", academicYearId);
    if (classId) params.set("class_room_id", classId);
    if (sectionId) params.set("section_id", sectionId);
    if (billingKind) params.set("billing_kind", billingKind);
    if (from) params.set("due_from", from);
    if (to) params.set("due_to", to);
    if (search.trim()) params.set("search", search.trim());
    return params;
  }, [academicYearId, classId, sectionId, billingKind, from, to, search]);

  const listParams = useMemo(() => {
    const params = new URLSearchParams(filters);
    params.set("page", String(page));
    params.set("per_page", "50");
    if (status) params.set("status", status);
    return params;
  }, [filters, page, status]);

  const listPath = `/v1/fee-reports/ar?${listParams.toString()}`;
  const summaryPath = `/v1/fee-reports/ar-summary${
    filters.toString() ? `?${filters.toString()}` : ""
  }`;

  const { data: report, loading, error } = useJson<ArReport>(listPath);
  const { data: summary } = useJson<ArSummary>(summaryPath);

  const update = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  const exportCsv = () => {
    if (!report) {
      return;
    }

    const header = [
      "Campus",
      "Student",
      "Admission No",
      "Roll No",
      "Class",
      "Section",
      "Fee Type",
      "Period",
      "Voucher",
      "Due Date",
      "Amount Due",
      "Amount Paid",
      "Outstanding",
      "Status",
    ];

    const rows = report.data.map((row) => [
      row.campus ?? "",
      row.student_name ?? "",
      row.admission_no ?? "",
      row.roll_number ?? "",
      row.class ?? "",
      row.section ?? "",
      row.fee_type ?? "",
      row.period ?? "",
      row.voucher_no,
      row.due_date ?? "",
      row.amount_due,
      row.amount_paid,
      row.outstanding,
      row.status_label ?? "",
    ]);

    const csv = [header, ...rows]
      .map((line) =>
        line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `accounts-receivable-${report.as_of}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    if (!report) {
      return;
    }

    const rows = report.data
      .map(
        (row) =>
          `<tr><td>${row.student_name ?? ""}</td><td>${row.roll_number ?? ""}</td><td>${row.class ?? ""}</td><td>${row.section ?? ""}</td><td>${row.fee_type ?? ""}</td><td>${row.period ?? ""}</td><td>${row.due_date ?? ""}</td><td style="text-align:right">${row.amount_due}</td><td style="text-align:right">${row.amount_paid}</td><td style="text-align:right">${row.outstanding}</td><td>${row.status_label ?? ""}</td></tr>`
      )
      .join("");

    const win = window.open("", "_blank", "width=1100,height=900");
    if (!win) {
      return;
    }

    win.document.write(`<!doctype html><html><head><title>Accounts receivable</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border-bottom: 1px solid #ddd; padding: 6px; font-size: 12px; }
        th { text-align: left; background: #f5f5f5; }
      </style></head><body>
      <h1>Accounts Receivable</h1>
      <p>As of ${report.as_of}. Total outstanding: ${formatCurrency(
        report.summary.outstanding
      )}</p>
      <table><thead><tr><th>Student</th><th>Roll</th><th>Class</th><th>Section</th><th>Fee Type</th><th>Period</th><th>Due</th><th>Due Amt</th><th>Paid</th><th>Outstanding</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <p style="margin-top:12px;font-weight:bold">Total Accounts Receivable: ${formatCurrency(
        report.summary.outstanding
      )}</p>
      <script>window.onload = function () { window.print(); };</script>
      </body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts receivable"
        description="Student-wise fee amounts due, paid and outstanding."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={exportCsv}>
              Export CSV
            </Button>
            <Button type="button" variant="secondary" onClick={printReport}>
              Print
            </Button>
          </div>
        }
      />

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Billed" value={formatCurrency(summary.totals.billed)} />
          <StatCard label="Collected" value={formatCurrency(summary.totals.collected)} />
          <StatCard
            label="Outstanding"
            value={formatCurrency(summary.totals.outstanding)}
          />
          <StatCard
            label="Collected today"
            value={formatCurrency(summary.collection.today)}
          />
          <StatCard
            label="This month"
            value={formatCurrency(summary.collection.this_month)}
          />
        </div>
      ) : null}

      <Card>
        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Academic year" htmlFor="ar_year">
            <Select
              id="ar_year"
              value={academicYearId}
              onChange={(event) => update(setAcademicYearId)(event.target.value)}
            >
              <option value="">All years</option>
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
              onChange={(event) => update(setClassId)(event.target.value)}
            >
              <option value="">All classes</option>
              {classes.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Section" htmlFor="ar_section">
            <Select
              id="ar_section"
              value={sectionId}
              onChange={(event) => update(setSectionId)(event.target.value)}
            >
              <option value="">All sections</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fee type" htmlFor="ar_kind">
            <Select
              id="ar_kind"
              value={billingKind}
              onChange={(event) => update(setBillingKind)(event.target.value)}
            >
              <option value="">All fee types</option>
              {BILLING_KINDS.map((kind) => (
                <option key={kind.value} value={kind.value}>
                  {kind.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Due from" htmlFor="ar_from">
            <TextInput
              id="ar_from"
              type="date"
              value={from}
              onChange={(event) => update(setFrom)(event.target.value)}
            />
          </Field>
          <Field label="Due to" htmlFor="ar_to">
            <TextInput
              id="ar_to"
              type="date"
              value={to}
              onChange={(event) => update(setTo)(event.target.value)}
            />
          </Field>
          <Field
            label="Search"
            htmlFor="ar_search"
            className="sm:col-span-2"
            hint="Student name, admission no or voucher no."
          >
            <TextInput
              id="ar_search"
              value={search}
              onChange={(event) => update(setSearch)(event.target.value)}
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-1 border-t border-border-secondary px-6 py-3">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => update(setStatus)(tab.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                status === tab.value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {error ? <ErrorNotice message={error} /> : null}

      <Card>
        {loading ? (
          <Spinner />
        ) : !report || report.data.length === 0 ? (
          <EmptyState message="No receivable charges match these filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead className="bg-[var(--surface-secondary)] text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Roll</th>
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2">Section</th>
                  <th className="px-3 py-2">Fee type</th>
                  <th className="px-3 py-2">Period</th>
                  <th className="px-3 py-2">Due date</th>
                  <th className="px-3 py-2 text-right">Amount due</th>
                  <th className="px-3 py-2 text-right">Paid</th>
                  <th className="px-3 py-2 text-right">Outstanding</th>
                  <th className="px-3 py-2">Status</th>
                  {canAny(AR_VIEW) ? <th className="px-3 py-2" /> : null}
                </tr>
              </thead>
              <tbody>
                {report.data.map((row) => (
                  <tr key={row.id} className="border-t border-border-secondary">
                    <td className="px-3 py-2">
                      <span className="block font-medium text-foreground">
                        {row.student_name}
                      </span>
                      <span className="block text-xs text-muted">
                        {row.admission_no} - {row.voucher_no}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted">{row.roll_number ?? "-"}</td>
                    <td className="px-3 py-2 text-muted">{row.class ?? "-"}</td>
                    <td className="px-3 py-2 text-muted">{row.section ?? "-"}</td>
                    <td className="px-3 py-2 text-muted">{row.fee_type ?? "-"}</td>
                    <td className="px-3 py-2 text-muted">{row.period ?? "-"}</td>
                    <td className="px-3 py-2 text-muted">{row.due_date ?? "-"}</td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(row.amount_due)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(row.amount_paid)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-foreground">
                      {formatCurrency(row.outstanding)}
                    </td>
                    <td className="px-3 py-2 text-muted">{row.status_label ?? "-"}</td>
                    {canAny(AR_VIEW) ? (
                      <td className="px-3 py-2 text-right">
                        <FeeVoucherAction
                          student={{
                            id: row.student_id,
                            full_name: row.student_name,
                            admission_no: row.admission_no,
                          }}
                        />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border-secondary font-semibold text-foreground">
                  <td className="px-3 py-2" colSpan={canAny(AR_VIEW) ? 10 : 9}>
                    Total Accounts Receivable
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(report.summary.outstanding)}
                  </td>
                  <td className="px-3 py-2" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {report && report.meta.last_page > 1 ? (
          <Pagination
            page={report.meta.current_page}
            lastPage={report.meta.last_page}
            total={report.meta.total}
            onPage={setPage}
          />
        ) : null}
      </Card>
    </div>
  );
}
