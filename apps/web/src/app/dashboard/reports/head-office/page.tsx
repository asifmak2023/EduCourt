"use client";

import { useMemo, useState } from "react";
import { PermissionGate } from "@/components/PermissionGate";
import { ErrorNotice } from "@/components/ui";
import { GroupedBarsChart, useChartColors } from "@/components/Charts";
import {
  ReportScaffold,
  ReportSection,
  ReportStatGrid,
  ReportTable,
} from "@/components/reports";
import { formatCurrency, formatNumber } from "@/lib/format";
import { downloadCsv, reportSlug } from "@/lib/csv";
import { useAuth } from "@/lib/auth";
import { useReport } from "@/lib/useReport";
import { buildReportQuery, type ReportFilterState } from "@/lib/reportPeriod";
import type { ReportHeadOffice } from "@/lib/types";

export default function HeadOfficeReportPage() {
  return (
    <PermissionGate permission="report.campus">
      <HeadOfficeReport />
    </PermissionGate>
  );
}

function HeadOfficeReport() {
  const { user } = useAuth();
  const isHeadOffice =
    user?.roles?.includes("institution_head") ||
    user?.roles?.includes("platform_admin") ||
    false;

  if (!isHeadOffice) {
    return (
      <ErrorNotice message="Only institution heads can view the head office report." />
    );
  }

  return <HeadOfficeReportBody />;
}

function HeadOfficeReportBody() {
  const colors = useChartColors();
  const [filters, setFilters] = useState<ReportFilterState>({
    granularity: "all",
    from: "",
    to: "",
  });

  const query = buildReportQuery(filters);
  const { data, loading, error } = useReport<ReportHeadOffice>(
    `/v1/reports/head-office${query}`
  );

  const rows = useMemo(() => data?.campuses ?? [], [data]);

  const exportRows = useMemo(() => {
    const campusRows = rows.map((row) => [
      row.campus,
      row.code ?? "",
      row.income,
      row.payments,
      row.balance,
      row.receivable,
      row.payable,
    ]);

    if (!data) {
      return campusRows;
    }

    return [
      ...campusRows,
      [
        "Grand total",
        "",
        data.totals.income,
        data.totals.payments,
        data.totals.balance,
        data.totals.receivable,
        data.totals.payable,
      ],
    ];
  }, [rows, data]);

  return (
    <ReportScaffold
      title="Head office report"
      description="Roll-up of income, payments, balance, receivables and payables per campus."
      active="head-office"
      filters={filters}
      onFiltersChange={setFilters}
      documentScope={
        data ? `${formatNumber(data.totals.campuses)} campuses` : null
      }
      periodLabel={data?.period?.label}
      loading={loading}
      error={error}
      hasData={Boolean(data)}
      onExport={() =>
        downloadCsv(
          `${reportSlug("head-office-report")}-${filters.granularity}`,
          ["Campus", "Code", "Income", "Payments", "Balance", "A/R", "A/P"],
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
                label: "Campuses",
                value: formatNumber(data.totals.campuses),
              },
              { label: "Income", value: formatCurrency(data.totals.income) },
              {
                label: "Payments",
                value: formatCurrency(data.totals.payments),
              },
              {
                label: "Balance",
                value: formatCurrency(data.totals.balance),
                hint: data.totals.balance >= 0 ? "Surplus" : "Deficit",
              },
              {
                label: "Receivable",
                value: formatCurrency(data.totals.receivable),
                hint: "A/R",
              },
              {
                label: "Payable",
                value: formatCurrency(data.totals.payable),
                hint: "A/P",
              },
            ]}
          />

          <ReportSection
            title="Income and payments by campus"
            description="Collected income against paid expenditure."
          >
            <div className="report-chart rounded border border-black/20 p-3">
              <GroupedBarsChart
                data={rows.map((row) => ({
                  label: row.campus,
                  income: row.income,
                  payments: row.payments,
                }))}
                series={[
                  {
                    key: "income",
                    label: "Income",
                    color: colors["--success"],
                  },
                  {
                    key: "payments",
                    label: "Payments",
                    color: colors["--danger"],
                  },
                ]}
                formatValue={(value) => formatCurrency(value)}
                emptyAsGraph
              />
            </div>
          </ReportSection>

          <ReportSection
            title="Campus roll-up"
            description="Each row reconciles with that campus report."
          >
            <ReportTable
              columns={[
                "Campus",
                "Income",
                "Payments",
                "Balance",
                "A/R",
                "A/P",
              ]}
              align={["left", "right", "right", "right", "right", "right"]}
              empty="No campuses in this institution."
              rows={rows.map((row) => [
                row.campus,
                formatCurrency(row.income),
                formatCurrency(row.payments),
                formatCurrency(row.balance),
                formatCurrency(row.receivable),
                formatCurrency(row.payable),
              ])}
              totalRow={[
                "Grand total",
                formatCurrency(data.totals.income),
                formatCurrency(data.totals.payments),
                formatCurrency(data.totals.balance),
                formatCurrency(data.totals.receivable),
                formatCurrency(data.totals.payable),
              ]}
            />
          </ReportSection>

          <ReportSection title="Students and staff by campus">
            <ReportTable
              columns={["Campus", "Students", "Staff", "Teaching", "Non-teaching"]}
              align={["left", "right", "right", "right", "right"]}
              empty="No campuses in this institution."
              rows={rows.map((row) => [
                row.campus,
                formatNumber(row.students.total),
                formatNumber(row.staff.total),
                formatNumber(row.staff.teaching),
                formatNumber(row.staff.non_teaching),
              ])}
            />
          </ReportSection>
        </>
      ) : null}
    </ReportScaffold>
  );
}
