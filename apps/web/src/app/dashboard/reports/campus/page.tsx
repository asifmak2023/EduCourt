"use client";

import { useMemo, useState } from "react";
import { PermissionGate } from "@/components/PermissionGate";
import { GroupedBarsChart, useChartColors } from "@/components/Charts";
import {
  ReportScaffold,
  ReportSection,
  ReportStatGrid,
  ReportTable,
} from "@/components/reports";
import { Field, Select } from "@/components/Form";
import { formatCurrency, formatNumber } from "@/lib/format";
import { downloadCsv, reportSlug } from "@/lib/csv";
import { useAuth } from "@/lib/auth";
import { useCampuses } from "@/lib/useLookups";
import { useReport } from "@/lib/useReport";
import { buildReportQuery, type ReportFilterState } from "@/lib/reportPeriod";
import type { ReportCampus } from "@/lib/types";

export default function CampusReportPage() {
  return (
    <PermissionGate permission="report.campus">
      <CampusReport />
    </PermissionGate>
  );
}

function isHeadUser(roles: string[] | undefined): boolean {
  return Boolean(
    roles?.includes("institution_head") || roles?.includes("platform_admin")
  );
}

function CampusReport() {
  const colors = useChartColors();
  const { user } = useAuth();
  const headUser = isHeadUser(user?.roles);
  const { items: campuses } = useCampuses(headUser);
  const [campusId, setCampusId] = useState("");
  const [filters, setFilters] = useState<ReportFilterState>({
    granularity: "all",
    from: "",
    to: "",
  });

  const needCampus = headUser && !campusId;
  const query = buildReportQuery({ ...filters, campus_id: campusId });
  const { data, loading, error } = useReport<ReportCampus>(
    needCampus ? null : `/v1/reports/campus${query}`
  );

  const exportRows = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      ["Income", "Due", data.income_breakdown.due],
      ["Income", "Received", data.income_breakdown.received],
      ["Income", "Other", data.income_breakdown.other],
      ["Income", "Receivable", data.income_breakdown.receivable],
      ["Payments", "Salaries", data.payments_breakdown.salaries],
      ["Payments", "Utilities", data.payments_breakdown.utilities],
      ["Payments", "Others", data.payments_breakdown.others],
      ["Payments", "Payable", data.payments_breakdown.payable],
      ["Students", "Total", data.students.total],
      ["Students", "New admissions", data.students.new_admissions],
      ["Students", "Withdrawals", data.students.withdrawals],
      ["Students", "Ongoing", data.students.ongoing],
      ["Staff", "Total", data.staff.total],
      ["Staff", "Teaching", data.staff.teaching],
      ["Staff", "Non-teaching", data.staff.non_teaching],
      ["Staff", "Males", data.staff.males],
      ["Staff", "Females", data.staff.females],
      ["Staff", "Hired", data.staff.hired],
      ["Staff", "Fired", data.staff.fired],
    ];
  }, [data]);

  return (
    <ReportScaffold
      title="Campus report"
      description="Income, payments, students and staff for one campus."
      active="campus"
      filters={filters}
      onFiltersChange={setFilters}
      rangeExtras={
        headUser ? (
          <div className="w-full sm:w-56">
            <Field label="Campus" htmlFor="report_campus_id">
              <Select
                id="report_campus_id"
                value={campusId}
                onChange={(event) => setCampusId(event.target.value)}
              >
                <option value="">Select a campus</option>
                {campuses.map((campus) => (
                  <option key={campus.id} value={campus.id}>
                    {campus.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : null
      }
      documentScope={data?.campus?.name ?? null}
      periodLabel={data?.period?.label}
      loading={loading}
      error={error}
      hasData={Boolean(data)}
      emptyMessage="Select a campus to view this report."
      onExport={() =>
        downloadCsv(
          `${reportSlug("campus-report")}-${filters.granularity}`,
          ["Group", "Metric", "Value"],
          exportRows
        )
      }
      exportDisabled={exportRows.length === 0}
    >
      {data ? (
        <>
          <ReportStatGrid
            items={[
              {
                label: "Income",
                value: formatCurrency(data.income),
                hint: "Received plus other income",
              },
              { label: "Payments", value: formatCurrency(data.payments) },
              {
                label: "Balance",
                value: formatCurrency(data.balance),
                hint: data.balance >= 0 ? "Surplus" : "Deficit",
              },
              {
                label: "Receivable",
                value: formatCurrency(data.receivable),
                hint: "A/R",
              },
              {
                label: "Payable",
                value: formatCurrency(data.payable),
                hint: "A/P",
              },
            ]}
          />

          <ReportSection
            title="Payment breakdown"
            description="Salaries, utilities and other operational spend."
          >
            <ReportTable
              columns={["Category", "Amount"]}
              align={["left", "right"]}
              rows={[
                [
                  "Salaries",
                  formatCurrency(data.payments_breakdown.salaries),
                ],
                [
                  "Utilities",
                  formatCurrency(data.payments_breakdown.utilities),
                ],
                [
                  "Others",
                  formatCurrency(data.payments_breakdown.others),
                ],
                [
                  "Outstanding payable",
                  formatCurrency(data.payments_breakdown.payable),
                ],
              ]}
            />
          </ReportSection>

          <ReportSection
            title="Income detail"
            description="Billed, collected and outstanding fee position."
          >
            <ReportTable
              columns={["Metric", "Amount"]}
              align={["left", "right"]}
              rows={[
                ["Fees due", formatCurrency(data.income_breakdown.due)],
                [
                  "Fees received",
                  formatCurrency(data.income_breakdown.fees),
                ],
                [
                  "Other income",
                  formatCurrency(data.income_breakdown.other),
                ],
                [
                  "Receivable (R/A)",
                  formatCurrency(data.income_breakdown.receivable),
                ],
              ]}
            />
          </ReportSection>

          <ReportSection title="Students">
            <ReportStatGrid
              items={[
                {
                  label: "Total students",
                  value: formatNumber(data.students.total),
                },
                {
                  label: "New admissions",
                  value: formatNumber(data.students.new_admissions),
                },
                {
                  label: "Withdrawals",
                  value: formatNumber(data.students.withdrawals),
                },
                {
                  label: "Ongoing",
                  value: formatNumber(data.students.ongoing),
                },
              ]}
            />
          </ReportSection>

          <ReportSection title="Staff">
            <ReportTable
              columns={["Metric", "Count"]}
              align={["left", "right"]}
              rows={[
                ["Total staff", formatNumber(data.staff.total)],
                ["Teaching", formatNumber(data.staff.teaching)],
                ["Non-teaching", formatNumber(data.staff.non_teaching)],
                ["Males", formatNumber(data.staff.males)],
                ["Females", formatNumber(data.staff.females)],
                ["Hired", formatNumber(data.staff.hired)],
                ["Fired", formatNumber(data.staff.fired)],
              ]}
            />
          </ReportSection>

          <ReportSection
            title="Income and expense"
            description="Received income against paid expenditure."
          >
            <div className="report-chart rounded border border-black/20 p-3">
              <GroupedBarsChart
                data={[
                  {
                    label: "Income",
                    received: data.income_breakdown.received,
                    fees: data.income_breakdown.fees,
                    other: data.income_breakdown.other,
                  },
                ]}
                series={[
                  {
                    key: "received",
                    label: "Received",
                    color: colors["--success"],
                  },
                  {
                    key: "fees",
                    label: "Fee receipts",
                    color: colors["--accent"],
                  },
                  {
                    key: "other",
                    label: "Other income",
                    color: colors["--warning"],
                  },
                ]}
                formatValue={(value) => formatCurrency(value)}
                emptyAsGraph
              />
            </div>
          </ReportSection>
        </>
      ) : null}
    </ReportScaffold>
  );
}
