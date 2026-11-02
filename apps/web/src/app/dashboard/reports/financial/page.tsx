"use client";

import { useMemo, useState } from "react";
import { PermissionGate } from "@/components/PermissionGate";
import {
  GroupedBarsChart,
  TrendChart,
  useChartColors,
} from "@/components/Charts";
import {
  ReportScaffold,
  ReportSection,
  ReportStatGrid,
  ReportTable,
} from "@/components/reports";
import { ReportYearSelect } from "@/components/reports/ReportRangeBar";
import { formatCurrency } from "@/lib/format";
import { downloadCsv, reportSlug } from "@/lib/csv";
import { useFiscalYears } from "@/lib/useLookups";
import { useReport } from "@/lib/useReport";
import { buildReportQuery, type ReportFilterState } from "@/lib/reportPeriod";
import type { ReportFinancial } from "@/lib/types";

export default function FinancialReportPage() {
  return (
    <PermissionGate permission="report.view">
      <FinancialReport />
    </PermissionGate>
  );
}

function FinancialReport() {
  const colors = useChartColors();
  const { items: fiscalYears } = useFiscalYears();
  const [fiscalYearId, setFiscalYearId] = useState("");
  const [filters, setFilters] = useState<ReportFilterState>({
    granularity: "all",
    from: "",
    to: "",
  });

  const query = buildReportQuery({
    ...filters,
    fiscal_year_id: fiscalYearId,
  });

  const { data, loading, error } = useReport<ReportFinancial>(
    `/v1/reports/financial${query}`
  );

  const series = useMemo(() => data?.series ?? [], [data]);

  const selectedYear = fiscalYears.find(
    (year) => String(year.id) === fiscalYearId
  );

  const exportRows = useMemo(
    () =>
      series.map((point) => [
        point.label,
        point.income,
        point.expense,
        point.surplus,
      ]),
    [series]
  );

  return (
    <ReportScaffold
      title="Financial report"
      description="Income, expense and surplus from the posted ledger."
      active="financial"
      filters={filters}
      onFiltersChange={setFilters}
      documentScope={selectedYear ? `Fiscal year ${selectedYear.name}` : null}
      periodLabel={data?.period?.label}
      loading={loading}
      error={error}
      hasData={Boolean(data)}
      onExport={() =>
        downloadCsv(
          `${reportSlug("financial")}-${filters.granularity}`,
          ["Period", "Income", "Expense", "Surplus"],
          exportRows
        )
      }
      exportDisabled={exportRows.length === 0}
      rangeExtras={
        <ReportYearSelect
          id="fin_year"
          label="Fiscal year"
          value={fiscalYearId}
          onChange={setFiscalYearId}
          items={fiscalYears.map((year) => ({ id: year.id, name: year.name }))}
          allLabel="All fiscal years"
        />
      }
    >
      {data ? (
        <>
          <ReportStatGrid
            items={[
              { label: "Income", value: formatCurrency(data.income) },
              { label: "Expense", value: formatCurrency(data.expense) },
              {
                label: "Surplus",
                value: formatCurrency(data.surplus),
                hint:
                  data.surplus_percentage === null
                    ? undefined
                    : `${data.surplus_percentage}% of income`,
              },
            ]}
          />

          <ReportSection
            title="Income vs expense"
            description="Posted ledger movement per period."
          >
            <div className="report-chart rounded border border-black/20 p-3">
              <GroupedBarsChart
                data={series.map((point) => ({
                  label: point.label,
                  income: point.income,
                  expense: point.expense,
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

          <ReportSection
            title="Surplus trend"
            description="Income minus expense for each period."
          >
            <div className="report-chart rounded border border-black/20 p-3">
              <TrendChart
                data={series.map((point) => ({
                  label: point.label,
                  value: point.surplus,
                }))}
                color={colors["--accent"]}
                formatValue={(value) => formatCurrency(value)}
              />
            </div>
          </ReportSection>

          <ReportSection title="Period breakdown">
            <ReportTable
              columns={["Period", "Income", "Expense", "Surplus"]}
              align={["left", "right", "right", "right"]}
              rows={series.map((point) => [
                point.label,
                formatCurrency(point.income),
                formatCurrency(point.expense),
                formatCurrency(point.surplus),
              ])}
            />
          </ReportSection>


        </>
      ) : null}
    </ReportScaffold>
  );
}
