"use client";

import { useMemo, useState } from "react";
import { PermissionGate } from "@/components/PermissionGate";
import {
  GroupedBarsChart,
  useChartColors,
} from "@/components/Charts";
import {
  ReportScaffold,
  ReportSection,
  ReportStatGrid,
  ReportTable,
} from "@/components/reports";
import { formatCurrency } from "@/lib/format";
import { downloadCsv, reportSlug } from "@/lib/csv";
import { useReport } from "@/lib/useReport";
import { buildReportQuery, type ReportFilterState } from "@/lib/reportPeriod";
import type { ReportPayroll } from "@/lib/types";

export default function PayrollReportPage() {
  return (
    <PermissionGate permission="report.view">
      <PayrollReport />
    </PermissionGate>
  );
}

function PayrollReport() {
  const colors = useChartColors();
  const [filters, setFilters] = useState<ReportFilterState>({
    granularity: "all",
    from: "",
    to: "",
  });

  const query = buildReportQuery(filters);

  const { data, loading, error } = useReport<ReportPayroll>(
    `/v1/reports/payroll${query}`
  );

  const series = data?.series ?? [];

  const runRows = useMemo(
    () =>
      (data?.by_period ?? []).map((run) => [
        run.period,
        run.status ?? "unknown",
        run.gross,
        run.deductions,
        run.net,
      ]),
    [data]
  );

  return (
    <ReportScaffold
      title="Payroll report"
      description="Payroll cost by period with gross, deductions and net."
      active="payroll"
      filters={filters}
      onFiltersChange={setFilters}
      /* Payroll runs are monthly by nature, so only month/year/all apply. */
      supported={["month", "year", "all"]}
      periodLabel={data?.period?.label}
      loading={loading}
      error={error}
      hasData={Boolean(data)}
      onExport={() =>
        downloadCsv(
          `${reportSlug("payroll")}-${filters.granularity}`,
          ["Period", "Status", "Gross", "Deductions", "Net"],
          runRows
        )
      }
      exportDisabled={runRows.length === 0}
    >
      {data ? (
        <>
          <ReportStatGrid
            items={[
              { label: "Payroll runs", value: String(data.totals.runs) },
              { label: "Gross", value: formatCurrency(data.totals.gross) },
              {
                label: "Deductions",
                value: formatCurrency(data.totals.deductions),
              },
              { label: "Net", value: formatCurrency(data.totals.net) },
              { label: "Approved", value: String(data.totals.approved) },
              { label: "Paid", value: String(data.totals.paid) },
            ]}
          />

          <ReportSection
            title="Cost by period"
            description="Gross, deductions and net for each payroll period."
          >
            <div className="report-chart rounded border border-black/20 p-3">
              <GroupedBarsChart
                data={series.map((point) => ({
                  label: point.label,
                  gross: point.gross,
                  net: point.net,
                }))}
                series={[
                  {
                    key: "gross",
                    label: "Gross",
                    color: colors["--accent"],
                  },
                  {
                    key: "net",
                    label: "Net",
                    color: colors["--success"],
                  },
                ]}
                formatValue={(value) => formatCurrency(value)}
                emptyAsGraph
              />
            </div>
          </ReportSection>

          <ReportSection title="Payroll runs">
            <ReportTable
              columns={["Period", "Status", "Gross", "Deductions", "Net"]}
              align={["left", "left", "right", "right", "right"]}
              empty="No payroll runs for this selection."
              rows={runRows.map((row) => [
                row[0],
                row[1],
                formatCurrency(row[2] as number),
                formatCurrency(row[3] as number),
                formatCurrency(row[4] as number),
              ])}
            />
          </ReportSection>

        </>
      ) : null}
    </ReportScaffold>
  );
}
