"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAcademicYearDefault } from "@/lib/academicYear";
import {
  useAcademicYears,
  useClassRooms,
  useSections,
  useStudents,
} from "@/lib/useLookups";
import { useJson } from "@/lib/useJson";
import { useAuth } from "@/lib/auth";
import { AR_VIEW } from "@/lib/permissions";
import { Button, Field, Select, TextInput } from "@/components/Form";
import { Pagination } from "@/components/Pagination";
import { PermissionGate } from "@/components/PermissionGate";
import { FeeVoucherAction } from "@/components/fee-counter/FeeVoucherAction";
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
import type { StudentFeeReport } from "@/lib/types";

const BILLING_KINDS = [
  { value: "monthly", label: "Monthly Fee" },
  { value: "exam", label: "Examination Fee" },
  { value: "one_time", label: "One-time Fee" },
  { value: "other", label: "Other Charge" },
  { value: "late_fee", label: "Late Fee" },
  { value: "legacy_installment", label: "Legacy Installment" },
];

const TABS = [
  { value: "", label: "All students" },
  { value: "outstanding", label: "Outstanding" },
  { value: "overdue", label: "Overdue" },
  { value: "cleared", label: "Cleared" },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function StudentFeeReportPage() {
  return (
    <PermissionGate permission={AR_VIEW}>
      <StudentFeeReportView />
    </PermissionGate>
  );
}

function StudentFeeReportView() {
  const { canAny } = useAuth();
  const { items: years } = useAcademicYears();
  const { items: classes } = useClassRooms();
  const { items: sections } = useSections();
  const { items: students } = useStudents();

  const [academicYearId, setAcademicYearId] = useState("");
  useAcademicYearDefault(years, academicYearId, setAcademicYearId);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [billingKind, setBillingKind] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [asOf, setAsOf] = useState(today);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const params = useMemo(() => {
    const query = new URLSearchParams();
    if (academicYearId) query.set("academic_year_id", academicYearId);
    if (classId) query.set("class_room_id", classId);
    if (sectionId) query.set("section_id", sectionId);
    if (studentId) query.set("student_id", studentId);
    if (billingKind) query.set("billing_kind", billingKind);
    if (from) query.set("due_from", from);
    if (to) query.set("due_to", to);
    if (status) query.set("status", status);
    if (asOf) query.set("as_of", asOf);
    if (search.trim()) query.set("search", search.trim());
    query.set("page", String(page));
    query.set("per_page", "50");
    return query;
  }, [academicYearId, classId, sectionId, studentId, billingKind, from, to, status, asOf, search, page]);

  const { data: report, loading, error } = useJson<StudentFeeReport>(
    `/v1/fee-reports/students?${params.toString()}`
  );

  const update = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  const exportCsv = () => {
    if (!report) {
      return;
    }

    const header = [
      "Admission No",
      "Student",
      "Class",
      "Section",
      "Charges",
      "Billed",
      "Received",
      "Receivable",
      "Overdue",
      "Last payment",
      "Status",
    ];

    const rows = report.data.map((row) => [
      row.admission_no ?? "",
      row.student_name ?? "",
      row.class ?? "",
      row.section ?? "",
      row.charges,
      row.billed,
      row.received,
      row.receivable,
      row.overdue,
      row.last_payment_date ?? "",
      row.status_label,
    ]);

    const total = [
      "Total",
      "",
      "",
      "",
      report.summary.charges,
      report.summary.billed,
      report.summary.received,
      report.summary.receivable,
      report.summary.overdue,
      "",
      "",
    ];

    const csv = [header, ...rows, total]
      .map((line) =>
        line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `student-fee-report-${report.as_of}.csv`;
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
          `<tr><td>${row.admission_no ?? ""}</td><td>${row.student_name ?? ""}</td><td>${row.class ?? ""}</td><td>${row.section ?? ""}</td><td style="text-align:right">${row.billed}</td><td style="text-align:right">${row.received}</td><td style="text-align:right">${row.receivable}</td><td style="text-align:right">${row.overdue}</td><td>${row.status_label}</td></tr>`
      )
      .join("");

    const win = window.open("", "_blank", "width=1100,height=900");
    if (!win) {
      return;
    }

    win.document.write(`<!doctype html><html><head><title>Student fee report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border-bottom: 1px solid #ddd; padding: 6px; font-size: 12px; }
        th { text-align: left; background: #f5f5f5; }
        tfoot td { font-weight: bold; }
      </style></head><body>
      <h1>Student Fee Report</h1>
      <p>As of ${report.as_of}. Billed ${formatCurrency(
        report.summary.billed
      )}, received ${formatCurrency(
        report.summary.received
      )}, receivable ${formatCurrency(report.summary.receivable)}.</p>
      <table><thead><tr><th>Admission No</th><th>Student</th><th>Class</th><th>Section</th><th>Billed</th><th>Received</th><th>Receivable</th><th>Overdue</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="4">Total</td><td style="text-align:right">${report.summary.billed}</td><td style="text-align:right">${report.summary.received}</td><td style="text-align:right">${report.summary.receivable}</td><td style="text-align:right">${report.summary.overdue}</td><td></td></tr></tfoot></table>
      <script>window.onload = function () { window.print(); };</script>
      </body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student fee report"
        description="One row per student with total billed, received, receivable and overdue amounts."
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

      {report ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Students" value={report.summary.students} />
          <StatCard label="Billed" value={formatCurrency(report.summary.billed)} />
          <StatCard
            label="Received"
            value={formatCurrency(report.summary.received)}
            tone="positive"
          />
          <StatCard
            label="Receivable"
            value={formatCurrency(report.summary.receivable)}
            tone="warning"
          />
          <StatCard
            label="Overdue"
            value={formatCurrency(report.summary.overdue)}
            tone="danger"
          />
          <StatCard
            label="Collection rate"
            value={`${report.summary.collection_rate}%`}
          />
        </div>
      ) : null}

      <Card>
        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Academic year" htmlFor="sfr_year">
            <Select
              id="sfr_year"
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
          <Field label="Class" htmlFor="sfr_class">
            <Select
              id="sfr_class"
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
          <Field label="Section" htmlFor="sfr_section">
            <Select
              id="sfr_section"
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
          <Field label="Student" htmlFor="sfr_student">
            <Select
              id="sfr_student"
              value={studentId}
              onChange={(event) => update(setStudentId)(event.target.value)}
            >
              <option value="">All students</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                  {student.admission_no ? ` (${student.admission_no})` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fee type" htmlFor="sfr_kind">
            <Select
              id="sfr_kind"
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
          <Field label="Due from" htmlFor="sfr_from">
            <TextInput
              id="sfr_from"
              type="date"
              value={from}
              onChange={(event) => update(setFrom)(event.target.value)}
            />
          </Field>
          <Field label="Due to" htmlFor="sfr_to">
            <TextInput
              id="sfr_to"
              type="date"
              value={to}
              onChange={(event) => update(setTo)(event.target.value)}
            />
          </Field>
          <Field label="As of" htmlFor="sfr_as_of">
            <TextInput
              id="sfr_as_of"
              type="date"
              value={asOf}
              onChange={(event) => update(setAsOf)(event.target.value)}
            />
          </Field>
          <Field
            label="Search"
            htmlFor="sfr_search"
            className="sm:col-span-2 lg:col-span-4"
            hint="Student name or admission number."
          >
            <TextInput
              id="sfr_search"
              type="search"
              value={search}
              onChange={(event) => update(setSearch)(event.target.value)}
              placeholder="Search students"
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-1 border-t border-border-secondary px-6 py-3">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => update(setStatus)(tab.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
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
          <EmptyState message="No students match these filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] text-sm">
              <thead className="bg-[var(--surface-secondary)] text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2">Section</th>
                  <th className="px-3 py-2 text-right">Charges</th>
                  <th className="px-3 py-2 text-right">Billed</th>
                  <th className="px-3 py-2 text-right">Received</th>
                  <th className="px-3 py-2 text-right">Receivable</th>
                  <th className="px-3 py-2 text-right">Overdue</th>
                  <th className="px-3 py-2">Last payment</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {report.data.map((row) => (
                  <tr
                    key={row.student_id}
                    className="border-t border-border-secondary"
                  >
                    <td className="px-3 py-2">
                      <Link
                        href={`/dashboard/students/${row.student_id}`}
                        className="block font-medium text-foreground hover:underline"
                      >
                        {row.student_name ?? `Student #${row.student_id}`}
                      </Link>
                      <span className="block text-xs text-muted">
                        {row.admission_no ?? "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted">{row.class ?? "-"}</td>
                    <td className="px-3 py-2 text-muted">
                      {row.section ?? "-"}
                    </td>
                    <td className="px-3 py-2 text-right text-muted">
                      {row.charges}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {formatCurrency(row.billed)}
                    </td>
                    <td className="px-3 py-2 text-right text-success">
                      {formatCurrency(row.received)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-foreground">
                      {formatCurrency(row.receivable)}
                    </td>
                    <td className="px-3 py-2 text-right text-danger">
                      {formatCurrency(row.overdue)}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {row.last_payment_date
                        ? formatDate(row.last_payment_date)
                        : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge value={row.status} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {canAny(AR_VIEW) ? (
                        <FeeVoucherAction
                          student={{
                            id: row.student_id,
                            full_name: row.student_name,
                            admission_no: row.admission_no,
                          }}
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border-secondary font-semibold text-foreground">
                  <td className="px-3 py-2" colSpan={3}>
                    Total for filtered students
                  </td>
                  <td className="px-3 py-2 text-right">
                    {report.summary.charges}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(report.summary.billed)}
                  </td>
                  <td className="px-3 py-2 text-right text-success">
                    {formatCurrency(report.summary.received)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(report.summary.receivable)}
                  </td>
                  <td className="px-3 py-2 text-right text-danger">
                    {formatCurrency(report.summary.overdue)}
                  </td>
                  <td className="px-3 py-2" colSpan={3} />
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
