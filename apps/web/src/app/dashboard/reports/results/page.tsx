"use client";

import { useMemo, useState } from "react";
import { PermissionGate } from "@/components/PermissionGate";
import { BarStatChart, useChartColors } from "@/components/Charts";
import {
  ReportScaffold,
  ReportSection,
  ReportStatGrid,
  ReportTable,
} from "@/components/reports";
import { Field, Select } from "@/components/Form";
import { formatNumber } from "@/lib/format";
import { downloadCsv, reportSlug } from "@/lib/csv";
import { useExams } from "@/lib/useLookups";
import { useReport } from "@/lib/useReport";
import type { ReportFilterState } from "@/lib/reportPeriod";
import type { ReportResults } from "@/lib/types";

export default function ResultsReportPage() {
  return (
    <PermissionGate permission="report.view">
      <ResultsReport />
    </PermissionGate>
  );
}

function ResultsReport() {
  const colors = useChartColors();
  const { items: exams } = useExams();
  const [examId, setExamId] = useState("");
  const [filters, setFilters] = useState<ReportFilterState>({
    granularity: "all",
    from: "",
    to: "",
  });

  const { data, loading, error } = useReport<ReportResults>(
    examId ? `/v1/reports/results/${examId}` : null
  );

  const paperRows = useMemo(
    () =>
      (data?.by_paper ?? []).map((row) => [
        row.subject ?? `Paper #${row.exam_paper_id}`,
        row.class_room ?? "-",
        row.entered,
        row.average,
        `${row.average_percentage}%`,
        row.passed,
        row.failed,
      ]),
    [data]
  );

  return (
    <ReportScaffold
      title="Results report"
      description="Pass rate, grade spread and subject averages for an exam."
      active="results"
      filters={filters}
      onFiltersChange={setFilters}
      supported={["all"]}
      showDates={false}
      showPeriods={false}
      documentTitle="Results report"
      documentScope={data?.exam.name ?? null}
      periodLabel={data?.period?.label}
      loading={loading}
      error={error}
      hasData={Boolean(data) && Boolean(examId)}
      emptyMessage="Select an exam to view its result summary."
      onExport={() =>
        downloadCsv(
          `${reportSlug(`results-${data?.exam.name ?? examId}`)}`,
          ["Subject", "Class", "Entered", "Average", "Avg %", "Passed", "Failed"],
          paperRows
        )
      }
      exportDisabled={paperRows.length === 0}
      rangeExtras={
        <div className="w-full sm:w-56">
          <Field label="Exam" htmlFor="results_exam" required>
            <Select
              id="results_exam"
              value={examId}
              onChange={(event) => setExamId(event.target.value)}
            >
              <option value="">Select exam</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      }
    >
      {data ? (
        <>
          <ReportStatGrid
            items={[
              {
                label: "Pass rate",
                value: `${data.totals.pass_percentage}%`,
              },
              { label: "Average", value: `${data.totals.average_percentage}%` },
              { label: "Graded", value: formatNumber(data.totals.graded) },
              { label: "Failed", value: formatNumber(data.totals.failed) },
              { label: "Absent", value: formatNumber(data.totals.absent) },
              {
                label: "Highest",
                value: `${data.totals.highest_percentage}%`,
              },
              {
                label: "Lowest",
                value: `${data.totals.lowest_percentage}%`,
              },
              { label: "Papers", value: formatNumber(data.totals.papers) },
            ]}
          />

          {(data.grade_distribution ?? []).length > 0 ? (
            <ReportSection
              title="Grade distribution"
              description="Students per grade band on the active grading scale."
            >
              <div className="report-chart rounded border border-black/20 p-3">
                <BarStatChart
                  data={(data.grade_distribution ?? []).map((row) => ({
                    label: row.grade,
                    value: row.total,
                  }))}
                  color={colors["--accent"]}
                />
              </div>
              <ReportTable
                columns={["Grade", "Range", "Students"]}
                align={["left", "left", "right"]}
                rows={(data.grade_distribution ?? []).map((row) => [
                  row.grade,
                  `${row.min_percentage}% - ${row.max_percentage}%`,
                  formatNumber(row.total),
                ])}
              />
            </ReportSection>
          ) : null}

          {(data.score_bands ?? []).length > 0 ? (
            <ReportSection
              title="Score bands"
              description="Distribution of student percentages."
            >
              <div className="report-chart rounded border border-black/20 p-3">
                <BarStatChart
                  data={(data.score_bands ?? []).map((row) => ({
                    label: row.band,
                    value: row.total,
                  }))}
                  color={colors["--success"]}
                />
              </div>
            </ReportSection>
          ) : null}

          <ReportSection title={`${data.exam.name} by subject`}>
            <ReportTable
              columns={[
                "Subject",
                "Class",
                "Entered",
                "Average",
                "Avg %",
                "Passed",
                "Failed",
              ]}
              align={["left", "left", "right", "right", "right", "right", "right"]}
              empty="No marks entered for this exam."
              rows={paperRows}
            />
          </ReportSection>


        </>
      ) : null}
    </ReportScaffold>
  );
}
