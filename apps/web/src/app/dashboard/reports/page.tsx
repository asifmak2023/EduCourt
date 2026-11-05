"use client";

import { useMemo, useState } from "react";
import { PermissionGate } from "@/components/PermissionGate";
import { ReportsTabs } from "@/components/ReportsTabs";
import { HubGrid, type HubSection } from "@/components/ModuleHub";
import { PageHeader, ErrorNotice, Spinner } from "@/components/ui";
import {
  GroupedBarsChart,
  useChartColors,
} from "@/components/Charts";
import type { NavIcon } from "@/lib/nav";
import {
  ReportActions,
  ReportDocument,
  ReportSection,
  ReportStatGrid,
  ReportTable,
} from "@/components/reports";
import { ReportRangeBar } from "@/components/reports/ReportRangeBar";
import { useAuth } from "@/lib/auth";
import { REPORT_PERMISSIONS } from "@/lib/permissions";
import { useReport } from "@/lib/useReport";
import { formatCurrency, formatNumber } from "@/lib/format";
import { downloadCsv, reportSlug } from "@/lib/csv";
import { buildReportQuery, type ReportFilterState } from "@/lib/reportPeriod";
import type { ReportCampusComparison } from "@/lib/types";

const REPORTS: (HubSection & { icon: NavIcon; permission: string })[] = [
  {
    href: "/dashboard/reports/campus",
    title: "Campus report",
    description:
      "Income, payments, students and staff for one campus over a period.",
    icon: "building",
    permission: "report.campus",
  },
  {
    href: "/dashboard/reports/head-office",
    title: "Head office report",
    description:
      "Per-campus roll-up of income, payments, balance, receivables and payables.",
    icon: "chart",
    permission: "report.campus",
  },
  {
    href: "/dashboard/reports/progress",
    title: "Progress",
    description:
      "Student, admission, enrollment and scholarship totals over a period.",
    icon: "arrowUp",
    permission: "report.students",
  },
  {
    href: "/dashboard/reports/attendance",
    title: "Attendance",
    description:
      "Present, absent and late totals with a per-class attendance rate.",
    icon: "check",
    permission: "report.attendance",
  },
  {
    href: "/dashboard/reports/results",
    title: "Results",
    description:
      "Pass rate, grade spread and per-subject averages for a chosen exam.",
    icon: "award",
    permission: "report.results",
  },
  {
    href: "/dashboard/reports/staff",
    title: "Staff",
    description:
      "Headcount by department and type, staff attendance and leave.",
    icon: "idCard",
    permission: "report.staff",
  },
  {
    href: "/dashboard/reports/students",
    title: "Student yearly",
    description:
      "A student's year-by-year attendance, academics and conduct summary.",
    icon: "users",
    permission: "report.students",
  },
  {
    href: "/dashboard/reports/financial",
    title: "Financial",
    description: "Income, expense and surplus from the posted ledger.",
    icon: "banknote",
    permission: "report.finance",
  },
  {
    href: "/dashboard/reports/payroll",
    title: "Payroll",
    description: "Payroll cost by period with gross, deductions and net.",
    icon: "wallet",
    permission: "report.payroll",
  },
];

export default function ReportsPage() {
  return (
    <PermissionGate permission={REPORT_PERMISSIONS}>
      <ReportsOverview />
    </PermissionGate>
  );
}

function ReportsOverview() {
  const { user, can } = useAuth();
  const isInstitutionHead =
    user?.roles?.includes("institution_head") ||
    user?.roles?.includes("platform_admin") ||
    false;

  const reports = REPORTS.filter((report) => can(report.permission));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Campus reporting and analytics for the current tenant."
      />
      <ReportsTabs active="overview" />
      <HubGrid sections={reports} />

      {isInstitutionHead ? <CampusComparison /> : null}
    </div>
  );
}

function CampusComparison() {
  const colors = useChartColors();
  const [filters, setFilters] = useState<ReportFilterState>({
    granularity: "all",
    from: "",
    to: "",
  });

  const query = buildReportQuery(filters);

  const { data, loading, error } = useReport<ReportCampusComparison>(
    `/v1/reports/campus-comparison${query}`
  );

  const rows = useMemo(() => data?.campuses ?? [], [data]);

  const exportRows = useMemo(
    () =>
      rows.map((row) => [
        row.campus,
        row.code ?? "",
        row.students,
        row.active_students,
        row.staff,
        row.admissions,
        row.attendance_percentage ?? "",
        row.income,
        row.expense,
        row.surplus,
        row.payroll_net,
      ]),
    [rows]
  );

  return (
    <div className="space-y-4 border-t border-border-secondary pt-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">
          Campus comparison
        </h2>
        <p className="text-sm text-muted">
          Consolidated view across every campus in the institution.
        </p>
      </div>

      <ReportRangeBar value={filters} onChange={setFilters} />

      {error ? <ErrorNotice message={error} /> : null}

      {loading ? (
        <Spinner />
      ) : data ? (
        <>
          <div className="print:hidden">
            <ReportActions
              onPrint={() => window.print()}
              exportDisabled={exportRows.length === 0}
              onExport={() =>
                downloadCsv(
                  `${reportSlug("campus-comparison")}-${filters.granularity}`,
                  [
                    "Campus",
                    "Code",
                    "Students",
                    "Active students",
                    "Staff",
                    "Admissions",
                    "Attendance %",
                    "Income",
                    "Expense",
                    "Surplus",
                    "Payroll net",
                  ],
                  exportRows
                )
              }
            />
          </div>

          <ReportDocument
            title="Campus comparison"
            subtitle={data.period?.label}
            scope={`${formatNumber(data.totals.campuses)} campuses`}
          >
            <ReportStatGrid
              items={[
                {
                  label: "Campuses",
                  value: formatNumber(data.totals.campuses),
                },
                {
                  label: "Students",
                  value: formatNumber(data.totals.students),
                  hint: `${formatNumber(data.totals.active_students)} active`,
                },
                { label: "Staff", value: formatNumber(data.totals.staff) },
                {
                  label: "Admissions",
                  value: formatNumber(data.totals.admissions),
                },
                {
                  label: "Income",
                  value: formatCurrency(data.totals.income),
                },
                {
                  label: "Expense",
                  value: formatCurrency(data.totals.expense),
                },
                {
                  label: "Surplus",
                  value: formatCurrency(data.totals.surplus),
                },
                {
                  label: "Payroll net",
                  value: formatCurrency(data.totals.payroll_net),
                },
              ]}
            />

            <ReportSection
              title="Students and staff"
              description="Headcount per campus."
            >
              <div className="report-chart rounded border border-black/20 p-3">
                <GroupedBarsChart
                  data={rows.map((row) => ({
                    label: row.campus,
                    students: row.students,
                    staff: row.staff,
                  }))}
                  series={[
                    {
                      key: "students",
                      label: "Students",
                      color: colors["--accent"],
                    },
                    {
                      key: "staff",
                      label: "Staff",
                      color: colors["--success"],
                    },
                  ]}
                  emptyAsGraph
                />
              </div>
            </ReportSection>

            <ReportSection
              title="Financial position"
              description="Income, expense and net payroll per campus."
            >
              <div className="report-chart rounded border border-black/20 p-3">
                <GroupedBarsChart
                  data={rows.map((row) => ({
                    label: row.campus,
                    income: row.income,
                    expense: row.expense,
                  }))}
                  series={[
                    {
                      key: "income",
                      label: "Income",
                      color: colors["--success"],
                    },
                    {
                      key: "expense",
                      label: "Expense",
                      color: colors["--danger"],
                    },
                  ]}
                  formatValue={(value) => formatCurrency(value)}
                  emptyAsGraph
                />
              </div>
            </ReportSection>

            <ReportSection title="Campus detail">
              <ReportTable
                columns={[
                  "Campus",
                  "Students",
                  "Active",
                  "Staff",
                  "Admissions",
                  "Attendance",
                  "Income",
                  "Expense",
                  "Surplus",
                  "Payroll net",
                ]}
                align={[
                  "left",
                  "right",
                  "right",
                  "right",
                  "right",
                  "right",
                  "right",
                  "right",
                  "right",
                  "right",
                ]}
                empty="No campuses in this institution."
                rows={rows.map((row) => [
                  row.campus,
                  formatNumber(row.students),
                  formatNumber(row.active_students),
                  formatNumber(row.staff),
                  formatNumber(row.admissions),
                  row.attendance_percentage === null
                    ? "-"
                    : `${row.attendance_percentage}%`,
                  formatCurrency(row.income),
                  formatCurrency(row.expense),
                  formatCurrency(row.surplus),
                  formatCurrency(row.payroll_net),
                ])}
              />
            </ReportSection>
          </ReportDocument>
        </>
      ) : null}
    </div>
  );
}
