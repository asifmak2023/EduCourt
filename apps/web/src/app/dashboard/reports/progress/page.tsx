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
import { ReportYearSelect } from "@/components/reports/ReportRangeBar";
import { formatCurrency, formatNumber } from "@/lib/format";
import { downloadCsv, reportSlug } from "@/lib/csv";
import { useAcademicYearDefault } from "@/lib/academicYear";
import { useAcademicYears } from "@/lib/useLookups";
import { useReport } from "@/lib/useReport";
import { buildReportQuery, type ReportFilterState } from "@/lib/reportPeriod";
import type { ReportProgress } from "@/lib/types";

export default function ProgressReportPage() {
  return (
    <PermissionGate permission="report.students">
      <ProgressReport />
    </PermissionGate>
  );
}

function ProgressReport() {
  const colors = useChartColors();
  const { items: academicYears } = useAcademicYears();
  const [academicYearId, setAcademicYearId] = useState("");
  useAcademicYearDefault(academicYears, academicYearId, setAcademicYearId);
  const [filters, setFilters] = useState<ReportFilterState>({
    granularity: "all",
    from: "",
    to: "",
  });

  const query = buildReportQuery({
    ...filters,
    academic_year_id: academicYearId,
  });

  const { data, loading, error } = useReport<ReportProgress>(
    `/v1/reports/progress${query}`
  );

  const selectedYear = academicYears.find(
    (year) => String(year.id) === academicYearId
  );

  const series = data?.series ?? [];
  const hasSeries = series.some(
    (point) => (point.admissions ?? 0) || (point.enrollments ?? 0) || (point.awards ?? 0)
  );

  const exportRows = useMemo(
    () =>
      (data?.students.by_status ?? []).map((row) => [
        "Student status",
        row.status,
        row.total,
      ]),
    [data]
  );

  return (
    <ReportScaffold
      title="Progress report"
      description="Student, admission, enrollment and scholarship movement."
      active="progress"
      filters={filters}
      onFiltersChange={setFilters}
      documentScope={selectedYear ? `Academic year ${selectedYear.name}` : null}
      periodLabel={data?.period?.label}
      loading={loading}
      error={error}
      hasData={Boolean(data)}
      onExport={() =>
        downloadCsv(
          `${reportSlug("progress")}-${filters.granularity}`,
          ["Group", "Label", "Total"],
          exportRows
        )
      }
      exportDisabled={exportRows.length === 0}
      rangeExtras={
        <ReportYearSelect
          id="progress_year"
          label="Academic year"
          value={academicYearId}
          onChange={setAcademicYearId}
          items={academicYears.map((year) => ({ id: year.id, name: year.name }))}
          allLabel="All years"
        />
      }
    >
      {data ? (
        <>
          <ReportStatGrid
            items={[
              {
                label: "Students",
                value: formatNumber(data.students.total),
                hint: `${formatNumber(data.students.active)} active`,
              },
              {
                label: "Admissions",
                value: formatNumber(data.admissions.total),
              },
              {
                label: "Enrollments",
                value: formatNumber(data.enrollments.total),
              },
              {
                label: "Active scholarships",
                value: formatNumber(data.scholarships.active_awards),
                hint: formatCurrency(data.scholarships.total_value),
              },
            ]}
          />

          <ReportSection
            title="Movement over time"
            description="Admissions, enrollments and scholarship awards per period."
          >
            <div className="report-chart grid gap-4 lg:grid-cols-2">
              <div className="rounded border border-black/20 p-3">
                <GroupedBarsChart
                  data={series.map((point) => ({
                    label: point.label,
                    admissions: point.admissions ?? 0,
                    enrollments: point.enrollments ?? 0,
                  }))}
                  series={[
                    {
                      key: "admissions",
                      label: "Admissions",
                      color: colors["--accent"],
                    },
                    {
                      key: "enrollments",
                      label: "Enrollments",
                      color: colors["--success"],
                    },
                  ]}
                  emptyAsGraph
                />
              </div>
              <div className="rounded border border-black/20 p-3">
                <GroupedBarsChart
                  data={series.map((point) => ({
                    label: point.label,
                    awards: point.awards ?? 0,
                  }))}
                  series={[
                    {
                      key: "awards",
                      label: "Scholarship awards",
                      color: colors["--warning"],
                    },
                  ]}
                  emptyAsGraph
                />
              </div>
            </div>
            {!hasSeries ? (
              <p className="mt-2 text-xs text-black/50">
                No movement recorded in this window.
              </p>
            ) : null}
          </ReportSection>

          <ReportSection title="Students by status">
            <ReportTable
              columns={["Status", "Students"]}
              align={["left", "right"]}
              rows={(data.students.by_status ?? []).map((row) => [
                row.status,
                formatNumber(row.total),
              ])}
            />
          </ReportSection>

          <ReportSection title="Students by gender">
            <ReportTable
              columns={["Gender", "Students"]}
              align={["left", "right"]}
              rows={(data.students.by_gender ?? []).map((row) => [
                row.gender ?? "Unspecified",
                formatNumber(row.total),
              ])}
            />
          </ReportSection>

          <ReportSection title="Admissions by status">
            <ReportTable
              columns={["Status", "Admissions"]}
              align={["left", "right"]}
              rows={(data.admissions.by_status ?? []).map((row) => [
                row.status,
                formatNumber(row.total),
              ])}
            />
          </ReportSection>

          <ReportSection title="Enrollments by status">
            <ReportTable
              columns={["Status", "Enrollments"]}
              align={["left", "right"]}
              rows={(data.enrollments.by_status ?? []).map((row) => [
                row.status,
                formatNumber(row.total),
              ])}
            />
          </ReportSection>

          <ReportSection title="Scholarships by type">
            <ReportTable
              columns={["Type", "Awards", "Value"]}
              align={["left", "right", "right"]}
              rows={(data.scholarships.by_type ?? []).map((row) => [
                row.type,
                formatNumber(row.awards),
                formatCurrency(row.value),
              ])}
            />
          </ReportSection>

          <ReportSection title="Academic events">
            <ReportTable
              columns={["Metric", "Total"]}
              align={["left", "right"]}
              rows={[["Academic events", formatNumber(data.events.total)]]}
            />
          </ReportSection>

        </>
      ) : null}
    </ReportScaffold>
  );
}
